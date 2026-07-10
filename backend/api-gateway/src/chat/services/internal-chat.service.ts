import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { ContentFilterService } from './content-filter.service';

type ChatRoomType = 'DIRECT' | 'GROUP' | 'TEAM' | 'MISSION' | 'ANNOUNCEMENT';
type ChatMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
type ChatMessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM' | 'VOICE_NOTE';

interface CreateRoomDto {
  name?: string;
  description?: string;
  type: ChatRoomType;
  companyId?: string;
  missionId?: string;
  memberIds: string[];
}

interface SendMessageDto {
  content: string;
  type?: ChatMessageType;
  replyToId?: string;
  mentions?: string[];
  // Nom de fichier de la pièce jointe (IMAGE/FILE) : filtré comme la légende — canal de
  // contournement du filtre texte (« appelle-moi-0612345678.jpg »).
  fileName?: string;
}

interface UpdateRoomDto {
  name?: string;
  description?: string;
  avatar?: string;
}

/**
 * Internal Company Chat Service
 * Handles group chats, team channels, and mission-specific conversations
 * for company employees.
 */
@Injectable()
export class InternalChatService {
  private readonly logger = new Logger(InternalChatService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private contentFilter: ContentFilterService,
  ) {}

  /**
   * Applique le content-filter à un texte de message (rooms MISSION/GROUP/TEAM
   * n'étaient PAS filtrées jusqu'ici → canal libre de désintermédiation).
   * Bloque (HIGH) ou masque (MEDIUM) puis renvoie le contenu à stocker.
   */
  private async enforceContentFilter(
    content: string,
    userId: string,
    type: ChatMessageType,
    opts?: { fileName?: string; missionId?: string | null },
  ): Promise<string> {
    // Les messages système ne transitent pas par les utilisateurs : on n'y touche pas.
    if (type === 'SYSTEM') return content;

    // 1) Filtre la LÉGENDE (content) — quel que soit le type (TEXT / IMAGE / FILE / VOICE_NOTE).
    let filtered = content;
    if (content && content.trim().length > 0) {
      const result = await this.contentFilter.filterContent(content, userId, 'chat_interne');
      if (result.isBlocked) {
        throw new BadRequestException({
          message:
            'Votre message contient des informations de contact interdites. Pour votre sécurité, veuillez communiquer uniquement via Krafolt.',
          detectedPatterns: result.detectedPatterns,
          violationType: result.violationType,
          code: 'CONTACT_INFO_BLOCKED',
        });
      }
      filtered = result.filteredContent;
    }

    // 2) Filtre le NOM DE FICHIER (canal de contournement des pièces jointes).
    if (opts?.fileName && opts.fileName.trim().length > 0) {
      const fn = await this.contentFilter.filterFileName(opts.fileName, userId, 'chat_interne');
      if (fn.isBlocked) {
        throw new BadRequestException({
          message:
            'Le nom du fichier contient des informations de contact interdites. Pour votre sécurité, veuillez communiquer uniquement via Krafolt.',
          detectedPatterns: fn.detectedPatterns,
          violationType: fn.violationType,
          code: 'CONTACT_INFO_BLOCKED',
        });
      }
    }

    // 3) Signal anti-fishing : IMAGE/FILE dans une room liée à une mission NON payée → on TRACE.
    // Restreint aux rooms « mission » : les rooms d'équipe internes (sans missionId) ne sont pas
    // un vecteur de désintermédiation client↔artisan. Ne bloque jamais.
    const isMedia = type === 'IMAGE' || type === 'FILE';
    if (isMedia && opts?.missionId) {
      const paid = await this.contentFilter.isMissionPaid(opts.missionId);
      if (!paid) {
        await this.contentFilter.flagPrePaymentMedia(userId, {
          fileName: opts.fileName,
          mediaType: type,
          missionId: opts.missionId,
          context: 'chat_interne',
        });
      }
    }

    return filtered;
  }

  /**
   * Create a new chat room
   */
  async createRoom(userId: string, dto: CreateRoomDto): Promise<any> {
    const { name, description, type, companyId, missionId, memberIds } = dto;

    // Validate company access if companyId provided
    if (companyId) {
      const hasAccess = await this.verifyCompanyAccess(userId, companyId);
      if (!hasAccess) {
        throw new ForbiddenException('Vous n\'avez pas accès à cette entreprise');
      }
    }

    // For DIRECT chat, check if conversation already exists
    if (type === 'DIRECT' && memberIds.length === 1) {
      const existingRoom = await this.findDirectChat(userId, memberIds[0]);
      if (existingRoom) {
        return existingRoom;
      }
    }

    // Create the room
    const room = await this.prisma.chatRoom.create({
      data: {
        name: type === 'DIRECT' ? null : name,
        description,
        type,
        companyId,
        missionId,
        createdBy: userId,
        members: {
          create: [
            // Creator as owner
            {
              userId,
              role: 'OWNER',
            },
            // Other members
            ...memberIds.map((memberId) => ({
              userId: memberId,
              role: 'MEMBER' as ChatMemberRole,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
      },
    });

    // Send system message for room creation
    if (type !== 'DIRECT') {
      await this.sendSystemMessage(room.id, userId, 'Conversation créée');
    }

    this.logger.log(`Chat room ${room.id} created by user ${userId}`);
    return this.formatRoom(room, userId);
  }

  /**
   * Get all rooms for a user
   */
  async getUserRooms(userId: string, companyId?: string): Promise<any[]> {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        isArchived: false,
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
        ...(companyId && { companyId }),
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        company: {
          select: { id: true, companyName: true },
        },
      },
      orderBy: [
        { lastMessageAt: 'desc' },
      ],
    });

    // Add unread count for each room
    return Promise.all(
      rooms.map(async (room) => {
        const member = room.members.find((m) => m.userId === userId);
        const unreadCount = await this.getUnreadCount(room.id, userId, member?.lastReadAt);
        return {
          ...this.formatRoom(room, userId),
          unreadCount,
          lastMessage: room.messages[0] ? this.formatMessage(room.messages[0]) : null,
        };
      })
    );
  }

  /**
   * Get company team chat rooms
   */
  async getCompanyRooms(userId: string, companyId: string): Promise<any[]> {
    // Verify company access
    const hasAccess = await this.verifyCompanyAccess(userId, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette entreprise');
    }

    return this.getUserRooms(userId, companyId);
  }

  /**
   * Get room details
   */
  async getRoom(roomId: string, userId: string): Promise<any> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        id: roomId,
        members: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true, role: true },
            },
          },
        },
        company: {
          select: { id: true, companyName: true },
        },
        mission: {
          select: { id: true, title: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Conversation non trouvée');
    }

    return this.formatRoom(room, userId);
  }

  /**
   * Get messages for a room with pagination
   */
  async getMessages(
    roomId: string,
    userId: string,
    limit = 50,
    before?: string,
  ): Promise<any[]> {
    // Verify membership
    await this.verifyMembership(roomId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        ...(before && { createdAt: { lt: new Date(before) } }),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Mark messages as read
    await this.markAsRead(roomId, userId);

    return messages.reverse().map(this.formatMessage);
  }

  /**
   * Send a message
   */
  async sendMessage(
    roomId: string,
    userId: string,
    dto: SendMessageDto,
  ): Promise<any> {
    const { content, type = 'TEXT', replyToId, mentions = [], fileName } = dto;

    // Verify membership and role
    const member = await this.verifyMembership(roomId, userId);

    if (member.role === 'VIEWER') {
      throw new ForbiddenException('Vous ne pouvez pas envoyer de messages dans cette conversation');
    }

    // Mission liée à la room (pour le signal anti-fishing média pré-paiement).
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      select: { missionId: true },
    });

    // 🛡️ Anti-désintermédiation : filtre la légende + le nom de fichier (bloque HIGH, masque
    // MEDIUM) et trace les médias envoyés avant paiement de la mission liée.
    const filteredContent = await this.enforceContentFilter(content, userId, type, {
      fileName,
      missionId: room?.missionId,
    });

    // Create message
    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        type,
        content: filteredContent,
        replyToId,
        mentions,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Update room's last message timestamp
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        lastMessageAt: new Date(),
        lastMessageId: message.id,
      },
    });

    // Mark as read for sender
    await this.markAsRead(roomId, userId);

    // Publish to Redis for real-time delivery
    await this.publishMessage(roomId, message);

    // Queue notifications for mentioned users
    if (mentions.length > 0) {
      await this.notifyMentions(roomId, message.id, userId, mentions);
    }

    this.logger.log(`Message ${message.id} sent to room ${roomId}`);
    return this.formatMessage(message);
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<any> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    // Only allow editing within 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (message.createdAt < fifteenMinutesAgo) {
      throw new BadRequestException('Le message ne peut plus être modifié');
    }

    // 🛡️ Anti-désintermédiation : le contenu édité passe aussi par le filtre.
    const filteredContent = await this.enforceContentFilter(newContent, userId, message.type as ChatMessageType);

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: filteredContent,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
    });

    return this.formatMessage(updated);
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        room: {
          include: {
            members: {
              where: { userId, leftAt: null },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    const member = message.room.members[0];
    const canDelete =
      message.senderId === userId ||
      member?.role === 'OWNER' ||
      member?.role === 'ADMIN';

    if (!canDelete) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce message');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: 'Ce message a été supprimé',
      },
    });
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<any> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Verify membership
    await this.verifyMembership(message.roomId, userId);

    const reactions = (message.reactions as Record<string, string[]>) || {};

    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(userId)) {
      reactions[emoji].push(userId);
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions },
    });
  }

  /**
   * Remove reaction from a message
   */
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<any> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    const reactions = (message.reactions as Record<string, string[]>) || {};

    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter((id) => id !== userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { reactions },
    });
  }

  /**
   * Add members to a room
   */
  async addMembers(
    roomId: string,
    userId: string,
    memberIds: string[],
  ): Promise<any> {
    const room = await this.getRoom(roomId, userId);
    const member = room.members.find((m: any) => m.user.id === userId);

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les administrateurs peuvent ajouter des membres');
    }

    if (room.type === 'DIRECT') {
      throw new BadRequestException('Impossible d\'ajouter des membres à une conversation directe');
    }

    // Add new members
    await this.prisma.chatMember.createMany({
      data: memberIds.map((memberId) => ({
        roomId,
        userId: memberId,
        role: 'MEMBER',
      })),
      skipDuplicates: true,
    });

    // Get user names for system message
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { firstName: true, lastName: true },
    });

    const names = users.map((u) => `${u.firstName} ${u.lastName}`).join(', ');
    await this.sendSystemMessage(roomId, userId, `${names} a rejoint la conversation`);

    return this.getRoom(roomId, userId);
  }

  /**
   * Remove a member from a room
   */
  async removeMember(
    roomId: string,
    userId: string,
    memberId: string,
  ): Promise<void> {
    const room = await this.getRoom(roomId, userId);
    const member = room.members.find((m: any) => m.user.id === userId);
    const targetMember = room.members.find((m: any) => m.user.id === memberId);

    if (!targetMember) {
      throw new NotFoundException('Membre non trouvé');
    }

    // Owner can remove anyone, admin can remove members
    const canRemove =
      member.role === 'OWNER' ||
      (member.role === 'ADMIN' && targetMember.role === 'MEMBER');

    if (!canRemove) {
      throw new ForbiddenException('Vous ne pouvez pas retirer ce membre');
    }

    await this.prisma.chatMember.updateMany({
      where: {
        roomId,
        userId: memberId,
      },
      data: { leftAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
      select: { firstName: true, lastName: true },
    });

    await this.sendSystemMessage(roomId, userId, `${user?.firstName} ${user?.lastName} a quitté la conversation`);
  }

  /**
   * Leave a room
   */
  async leaveRoom(roomId: string, userId: string): Promise<void> {
    const member = await this.verifyMembership(roomId, userId);

    if (member.role === 'OWNER') {
      // Transfer ownership or delete room
      const otherMembers = await this.prisma.chatMember.findMany({
        where: {
          roomId,
          userId: { not: userId },
          leftAt: null,
        },
        orderBy: { joinedAt: 'asc' },
      });

      if (otherMembers.length > 0) {
        // Transfer to first admin or first member
        const newOwner =
          otherMembers.find((m) => m.role === 'ADMIN') || otherMembers[0];

        await this.prisma.chatMember.update({
          where: { id: newOwner.id },
          data: { role: 'OWNER' },
        });
      }
    }

    await this.prisma.chatMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    await this.sendSystemMessage(roomId, userId, `${user?.firstName} ${user?.lastName} a quitté la conversation`);
  }

  /**
   * Update room settings
   */
  async updateRoom(
    roomId: string,
    userId: string,
    dto: UpdateRoomDto,
  ): Promise<any> {
    const room = await this.getRoom(roomId, userId);
    const member = room.members.find((m: any) => m.user.id === userId);

    if (member.role !== 'OWNER' && member.role !== 'ADMIN') {
      throw new ForbiddenException('Seuls les administrateurs peuvent modifier la conversation');
    }

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: dto,
    });

    return this.getRoom(roomId, userId);
  }

  /**
   * Archive a room
   */
  async archiveRoom(roomId: string, userId: string): Promise<void> {
    const room = await this.getRoom(roomId, userId);
    const member = room.members.find((m: any) => m.user.id === userId);

    if (member.role !== 'OWNER') {
      throw new ForbiddenException('Seul le propriétaire peut archiver la conversation');
    }

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { isArchived: true },
    });
  }

  /**
   * Pin/unpin a room for a user
   */
  async togglePinRoom(roomId: string, userId: string): Promise<any> {
    const member = await this.verifyMembership(roomId, userId);

    return this.prisma.chatMember.update({
      where: { id: member.id },
      data: { isPinned: !member.isPinned },
    });
  }

  /**
   * Mute/unmute a room for a user
   */
  async toggleMuteRoom(roomId: string, userId: string): Promise<any> {
    const member = await this.verifyMembership(roomId, userId);

    return this.prisma.chatMember.update({
      where: { id: member.id },
      data: { isMuted: !member.isMuted },
    });
  }

  /**
   * Search messages in a room
   */
  async searchMessages(
    roomId: string,
    userId: string,
    query: string,
  ): Promise<any[]> {
    await this.verifyMembership(roomId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
        isDeleted: false,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return messages.map(this.formatMessage);
  }

  /**
   * Get available company members to add to a chat
   */
  async getCompanyMembers(userId: string, companyId: string): Promise<any[]> {
    const hasAccess = await this.verifyCompanyAccess(userId, companyId);
    if (!hasAccess) {
      throw new ForbiddenException('Vous n\'avez pas accès à cette entreprise');
    }

    const employees = await this.prisma.companyEmployee.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // Also get company owner
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    const members = employees.map((e) => ({
      ...e.user,
      employeeRole: e.role,
    }));

    if (company?.owner) {
      members.unshift({
        ...company.owner,
        employeeRole: 'OWNER',
      });
    }

    return members;
  }

  // ============ Private Helper Methods ============

  private async verifyMembership(roomId: string, userId: string): Promise<any> {
    const member = await this.prisma.chatMember.findFirst({
      where: {
        roomId,
        userId,
        leftAt: null,
      },
    });

    if (!member) {
      throw new ForbiddenException('Vous n\'êtes pas membre de cette conversation');
    }

    return member;
  }

  private async verifyCompanyAccess(userId: string, companyId: string): Promise<boolean> {
    const employee = await this.prisma.companyEmployee.findFirst({
      where: {
        userId,
        companyId,
        status: 'ACTIVE',
      },
    });

    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        ownerId: userId,
      },
    });

    return !!employee || !!company;
  }

  private async findDirectChat(userId1: string, userId2: string): Promise<any> {
    const room = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          {
            members: {
              some: {
                userId: userId1,
                leftAt: null,
              },
            },
          },
          {
            members: {
              some: {
                userId: userId2,
                leftAt: null,
              },
            },
          },
        ],
      },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatar: true },
            },
          },
        },
      },
    });

    return room ? this.formatRoom(room, userId1) : null;
  }

  private async sendSystemMessage(roomId: string, actorId: string, content: string): Promise<void> {
    await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId: actorId,
        type: 'SYSTEM',
        content,
      },
    });
  }

  private async markAsRead(roomId: string, userId: string): Promise<void> {
    await this.prisma.chatMember.updateMany({
      where: {
        roomId,
        userId,
        leftAt: null,
      },
      data: {
        lastReadAt: new Date(),
      },
    });
  }

  private async getUnreadCount(
    roomId: string,
    userId: string,
    lastReadAt?: Date | null,
  ): Promise<number> {
    if (!lastReadAt) {
      return this.prisma.chatMessage.count({
        where: {
          roomId,
          senderId: { not: userId },
          isDeleted: false,
        },
      });
    }

    return this.prisma.chatMessage.count({
      where: {
        roomId,
        senderId: { not: userId },
        isDeleted: false,
        createdAt: { gt: lastReadAt },
      },
    });
  }

  private async publishMessage(roomId: string, message: any): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.publish(`chat:room:${roomId}`, JSON.stringify(this.formatMessage(message)));
    } catch (error) {
      this.logger.error(`Failed to publish message to Redis: ${error}`);
    }
  }

  private async notifyMentions(
    roomId: string,
    messageId: string,
    senderId: string,
    mentionedUserIds: string[],
  ): Promise<void> {
    const sender = await this.prisma.user.findUnique({
      where: { id: senderId },
      select: { firstName: true, lastName: true },
    });

    for (const userId of mentionedUserIds) {
      if (userId === senderId) continue;

      await this.prisma.notification.create({
        data: {
          userId,
          type: 'CHAT_MENTION',
          title: 'Vous avez été mentionné',
          message: `${sender?.firstName} ${sender?.lastName} vous a mentionné dans un message`,
          link: `/chat/room/${roomId}`,
        },
      });
    }
  }

  private formatRoom(room: any, currentUserId: string): any {
    // For direct chats, get the other person's name as room name
    let displayName = room.name;
    if (room.type === 'DIRECT') {
      const otherMember = room.members.find((m: any) =>
        (m.user?.id || m.userId) !== currentUserId
      );
      if (otherMember?.user) {
        displayName = `${otherMember.user.firstName} ${otherMember.user.lastName}`;
      }
    }

    const currentMember = room.members.find((m: any) =>
      (m.user?.id || m.userId) === currentUserId
    );

    return {
      id: room.id,
      name: displayName,
      description: room.description,
      type: room.type,
      avatar: room.avatar,
      companyId: room.companyId,
      company: room.company,
      missionId: room.missionId,
      mission: room.mission,
      isArchived: room.isArchived,
      isPinned: currentMember?.isPinned || false,
      isMuted: currentMember?.isMuted || false,
      myRole: currentMember?.role,
      members: room.members.map((m: any) => ({
        id: m.id,
        role: m.role,
        user: m.user,
        joinedAt: m.joinedAt,
      })),
      lastMessageAt: room.lastMessageAt,
      createdAt: room.createdAt,
    };
  }

  private formatMessage(message: any): any {
    return {
      id: message.id,
      type: message.type,
      content: message.content,
      sender: message.sender,
      replyTo: message.replyTo,
      attachments: message.attachments || [],
      mentions: message.mentions || [],
      reactions: message.reactions || {},
      isEdited: message.isEdited,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
    };
  }
}
