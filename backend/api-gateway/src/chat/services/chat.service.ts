import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { FcmService } from '../../fcm/services/fcm.service';
import { EncryptionService } from './encryption.service';
import { ContentFilterService } from './content-filter.service';
import { DisintermediationDetectorService } from '../../fraud/services/disintermediation-detector.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private jwtService: JwtService,
    private fcmService: FcmService,
    private encryptionService: EncryptionService,
    private contentFilter: ContentFilterService,
    private disintermediationDetector: DisintermediationDetectorService,
  ) {}

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      // Le payload JWT porte l'id dans `sub` ; on expose aussi `userId` (le gateway l'utilise).
      return { ...payload, userId: payload.sub || payload.userId };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async createMessage(data: {
    senderId: string;
    receiverId: string;
    content: string;
    missionId?: string;
    // Type + nom de fichier optionnels : quand la pièce jointe est une IMAGE/FILE, on filtre
    // aussi la LÉGENDE (content) ET le NOM DE FICHIER, et on trace le média pré-paiement.
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE_NOTE';
    fileName?: string;
  }) {
    // 🛡️ CONTENT MODERATION - Filter for contact information (légende, quel que soit le type)
    const filterResult = await this.contentFilter.filterContent(data.content, data.senderId);

    // Block message if HIGH severity violations detected
    if (filterResult.isBlocked) {
      // 🛡️ HOOK détecteur leakage : un message bloqué alimente le score anti-désintermédiation
      // (offPlatformSolicitationCount + enforcement gradué). Sans ce câblage, un fraudeur PATIENT
      // (sous 5 violations) n'était jamais flaggé. Best-effort : n'empêche jamais le blocage.
      await this.disintermediationDetector
        .recordBlockedMessage(data.senderId, { content: data.content, detectedPatterns: filterResult.detectedPatterns })
        .catch(() => undefined);
      throw new BadRequestException({
        message: 'Votre message contient des informations de contact interdites. Pour votre sécurité et celle de nos utilisateurs, veuillez communiquer uniquement via Krafolt.',
        detectedPatterns: filterResult.detectedPatterns,
        violationType: filterResult.violationType,
        code: 'CONTACT_INFO_BLOCKED'
      });
    }

    // 🛡️ Le NOM DE FICHIER est un canal de contournement : « appelle-moi-0612345678.jpg ».
    if (data.fileName) {
      const fnResult = await this.contentFilter.filterFileName(data.fileName, data.senderId);
      if (fnResult.isBlocked) {
        throw new BadRequestException({
          message: 'Le nom du fichier contient des informations de contact interdites. Pour votre sécurité, veuillez communiquer uniquement via Krafolt.',
          detectedPatterns: fnResult.detectedPatterns,
          violationType: fnResult.violationType,
          code: 'CONTACT_INFO_BLOCKED',
        });
      }
    }

    // 🛡️ Détection GLISSANTE inter-messages : un numéro éclaté sur plusieurs messages courts
    // consécutifs (« 62 11 » puis « 23 456 ») passe le filtre sans état message par message.
    // On concatène les chiffres des ~4 derniers messages du MÊME expéditeur vers le MÊME
    // destinataire (fenêtre 15 min) + le message courant ; si un numéro complet émerge → blocage.
    // Fail-open sur toute erreur d'infra (DB / déchiffrement) : ne bloque jamais un message légitime.
    try {
      const since = new Date(Date.now() - 15 * 60 * 1000);
      const prior = await this.prisma.message.findMany({
        where: { senderId: data.senderId, receiverId: data.receiverId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 4,
        select: { content: true },
      });
      if (prior.length > 0) {
        const key = this.encryptionService.generateConversationKey(data.senderId, data.receiverId);
        const priorTexts = prior
          .map((m) => {
            try {
              return this.encryptionService.decryptMessage(m.content, key);
            } catch {
              return '';
            }
          })
          .reverse(); // ordre chronologique (le plus ancien en premier)
        const chrono = [...priorTexts, data.content];
        const split = await this.contentFilter.detectSplitPhone(data.senderId, chrono);
        if (split) {
          await this.disintermediationDetector
            .recordBlockedMessage(data.senderId, { content: data.content, detectedPatterns: ['PHONE_SPLIT_MULTIMSG'] })
            .catch(() => undefined);
          throw new BadRequestException({
            message: 'Votre message complète un numéro de téléphone partagé sur plusieurs messages. Pour votre sécurité et celle de nos utilisateurs, veuillez communiquer uniquement via Krafolt.',
            detectedPatterns: ['PHONE_SPLIT_MULTIMSG'],
            violationType: 'HIGH',
            code: 'CONTACT_INFO_BLOCKED',
          });
        }
      }
    } catch (e) {
      // Le blocage volontaire doit remonter ; toute autre erreur est avalée (fail-open).
      if (e instanceof BadRequestException) throw e;
    }

    // 🛡️ Signal anti-fishing : IMAGE/FILE envoyé AVANT paiement de la mission (ou chat direct
    // sans mission payée) → on TRACE (ne bloque pas). L'OCR réel de l'image est hors périmètre.
    const isMedia = data.type === 'IMAGE' || data.type === 'FILE';
    if (isMedia) {
      const paid = await this.contentFilter.isMissionPaid(data.missionId);
      if (!paid) {
        await this.contentFilter.flagPrePaymentMedia(data.senderId, {
          fileName: data.fileName,
          mediaType: data.type,
          missionId: data.missionId,
          context: 'chat_direct',
        });
      }
    }

    // 🛡️ Message ACCEPTÉ mais à INTENTION hors-plateforme (« on se voit en direct sans commission »,
    // sans coordonnées explicites) : le filtre ne bloque pas, mais on ALIMENTE le détecteur leakage
    // pour qu'un fraudeur évasif accumule un score et finisse flaggé/gelé automatiquement.
    if (this.disintermediationDetector.scanSolicitation(data.content).matched.length > 0) {
      await this.disintermediationDetector
        .recordBlockedMessage(data.senderId, { content: data.content, detectedPatterns: ['OFF_PLATFORM_SOLICITATION'] })
        .catch(() => undefined);
    }

    // Use filtered content (for MEDIUM severity, we allow but filter)
    const contentToSend = filterResult.detectedPatterns.length > 0
      ? filterResult.filteredContent
      : data.content;

    // Generate conversation key for encryption
    const conversationKey = this.encryptionService.generateConversationKey(
      data.senderId,
      data.receiverId
    );

    // Encrypt message content
    const encryptedContent = this.encryptionService.encryptMessage(
      contentToSend,
      conversationKey
    );

    const created = await this.prisma.message.create({
      data: {
        senderId: data.senderId,
        receiverId: data.receiverId,
        content: encryptedContent,
      },
    });

    // On renvoie le contenu FILTRÉ en clair (jamais le brut, jamais le chiffré) :
    // le gateway diffuse `message.content` au destinataire / à la push notif.
    return { ...created, content: contentToSend };
  }

  async getMessage(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async getConversation(userId: string, otherUserId: string, limit: number = 50) {
    const messages = await this.prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Decrypt messages — tolérant : un message illisible ne doit pas faire échouer toute la conversation.
    const conversationKey = this.encryptionService.generateConversationKey(userId, otherUserId);

    return messages.map(message => {
      let content: string;
      try {
        content = this.encryptionService.decryptMessage(message.content, conversationKey);
      } catch {
        content = '[message illisible]';
      }
      return { ...message, content };
    });
  }

  async getConversations(userId: string) {
    // Dernière conversation par interlocuteur (Postgres : identifiants camelCase entre guillemets).
    const rows: Array<{ other_user_id: string; last_message: string; last_message_at: Date }> =
      await this.prisma.$queryRaw`
      SELECT DISTINCT ON (other_user_id)
        other_user_id, last_message, last_message_at
      FROM (
        SELECT
          CASE WHEN "senderId" = ${userId} THEN "receiverId" ELSE "senderId" END as other_user_id,
          "content" as last_message,
          "createdAt" as last_message_at
        FROM "Message"
        WHERE "senderId" = ${userId} OR "receiverId" = ${userId}
        ORDER BY "createdAt" DESC
      ) as c
      ORDER BY other_user_id, last_message_at DESC
    `;

    const otherIds = rows.map((r) => r.other_user_id);
    if (otherIds.length === 0) return [];

    // Détails des interlocuteurs + compteur de non-lus.
    const [users, unread] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
      }),
      this.prisma.message.groupBy({
        by: ['senderId'],
        where: { receiverId: userId, read: false, senderId: { in: otherIds } },
        _count: { _all: true },
      }),
    ]);
    const userMap = new Map(users.map((u) => [u.id, u]));
    const unreadMap = new Map(unread.map((u) => [u.senderId, u._count._all]));

    // Forme attendue par le front : { userId, user, lastMessage, unreadCount }.
    return rows
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      .map((r) => {
        // Déchiffre l'aperçu du dernier message (sinon le front affiche du base64 chiffré).
        let preview = '';
        try {
          const key = this.encryptionService.generateConversationKey(userId, r.other_user_id);
          preview = this.encryptionService.decryptMessage(r.last_message, key);
        } catch { preview = ''; }
        return {
          userId: r.other_user_id,
          user: userMap.get(r.other_user_id) || { id: r.other_user_id, firstName: '', lastName: '' },
          lastMessage: { content: preview, createdAt: r.last_message_at },
          unreadCount: unreadMap.get(r.other_user_id) || 0,
        };
      });
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await this.getMessage(messageId);

    if (message.receiverId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async markConversationAsRead(userId: string, otherUserId: string) {
    return this.prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  async setUserOnline(userId: string) {
    const client = this.redis.getClient();
    await client.setex(`user:online:${userId}`, 300, 'true'); // 5 min TTL
  }

  async setUserOffline(userId: string) {
    const client = this.redis.getClient();
    await client.del(`user:online:${userId}`);
  }

  async isUserOnline(userId: string): Promise<boolean> {
    const client = this.redis.getClient();
    const status = await client.get(`user:online:${userId}`);
    return status === 'true';
  }

  async sendPushNotification(userId: string, notification: { title: string; body: string; data?: Record<string, string> }) {
    // Send push notification via FCM
    await this.fcmService.sendToUser(userId, notification);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.getMessage(messageId);

    if (message.senderId !== userId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
