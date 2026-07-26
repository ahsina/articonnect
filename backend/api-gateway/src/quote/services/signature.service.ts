import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceService } from '../../invoice/services/invoice.service';
import { MissionStatus } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';

/**
 * Electronic Signature Service for Quotes
 *
 * Implements a legally compliant electronic signature system for France:
 * - Simple electronic signature (compliant with eIDAS regulation)
 * - Signature audit trail
 * - Document hash verification
 * - IP and timestamp recording
 */

export interface SignatureData {
  quoteId: string;
  signerId: string;
  signerRole: 'CLIENT' | 'ARTISAN';
  signatureImage?: string; // Base64 encoded signature image
  signatureType: 'DRAWN' | 'TYPED' | 'CHECKBOX';
  ipAddress: string;
  userAgent: string;
}

export interface SignatureVerification {
  isValid: boolean;
  signedAt: Date;
  signedBy: string;
  documentHash: string;
  reason?: string;
}

@Injectable()
export class SignatureService {
  private readonly logger = new Logger(SignatureService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceService: InvoiceService,
  ) {}

  /**
   * Sign a quote electronically
   */
  async signQuote(data: SignatureData): Promise<{
    signatureId: string;
    signedAt: Date;
    documentHash: string;
  }> {
    const { quoteId, signerId, signerRole, signatureImage, signatureType, ipAddress, userAgent } = data;

    // Get the quote
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lineItems: true,
        artisan: true,
        client: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Devis non trouvé');
    }

    // Verify quote status
    if (quote.status !== 'SENT' && quote.status !== 'PENDING') {
      throw new BadRequestException(
        `Ce devis ne peut pas être signé (statut: ${quote.status})`
      );
    }

    // Verify signer is authorized
    if (signerRole === 'CLIENT' && quote.clientId !== signerId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à signer ce devis');
    }
    if (signerRole === 'ARTISAN' && quote.artisanId !== signerId) {
      throw new ForbiddenException('Vous n\'êtes pas autorisé à signer ce devis');
    }

    // Check if already signed by this role
    const existingSignature = await this.prisma.quoteSignature.findFirst({
      where: {
        quoteId,
        signerRole,
        status: 'VALID',
      },
    });

    if (existingSignature) {
      throw new BadRequestException(`Ce devis a déjà été signé par ${signerRole === 'CLIENT' ? 'le client' : 'l\'artisan'}`);
    }

    // Generate document hash (includes all quote content)
    const documentHash = this.generateDocumentHash(quote);

    // Generate unique signature ID
    const signatureToken = randomBytes(32).toString('hex');

    // Create signature record
    const signature = await this.prisma.quoteSignature.create({
      data: {
        quoteId,
        signerId,
        signerRole,
        signatureImage,
        signatureType,
        documentHash,
        signatureToken,
        ipAddress,
        userAgent,
        signedAt: new Date(),
        status: 'VALID',
        // Legal audit trail
        legalText: this.getLegalText(signerRole),
        consentGiven: true,
      },
    });

    // Check if quote is now fully signed
    const allSignatures = await this.prisma.quoteSignature.findMany({
      where: {
        quoteId,
        status: 'VALID',
      },
    });

    const hasClientSignature = allSignatures.some(s => s.signerRole === 'CLIENT');
    const hasArtisanSignature = allSignatures.some(s => s.signerRole === 'ARTISAN');

    if (hasClientSignature) {
      // Update quote status when client signs
      await this.prisma.quote.update({
        where: { id: quoteId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      });

      this.logger.log(`Quote ${quoteId} accepted and signed by ${signerRole}`);

      // La signature client vaut acceptation → le devis doit devenir SA PROPRE mission (source de vérité
      // du prix). Devis autonome (sans mission liée) : on CRÉE la mission à partir du devis. Devis déjà
      // lié à une demande : on synchronise le prix convenu (pour que facture = escrow = mission).
      try {
        const q = await this.prisma.quote.findUnique({ where: { id: quoteId } });
        if (q) {
          if (!q.missionId) {
            const stdVat: Record<string, number> = { LU: 17, FR: 20, BE: 21 };
            const country = (q.country || 'LU').toUpperCase();
            const mission = await this.prisma.mission.create({
              data: {
                clientId: q.clientId,
                artisanId: q.artisanId,
                type: 'QUOTE',
                title: q.title,
                description: q.description || q.title,
                category: q.category,
                address: q.address || '',
                city: q.city || '',
                postalCode: q.postalCode || '',
                country,
                latitude: 0,
                longitude: 0,
                vatRate: stdVat[country] ?? 21,
                agreedPrice: q.totalAmount,
                status: MissionStatus.PENDING_DEPOSIT,
              },
            });
            await this.prisma.quote.update({ where: { id: quoteId }, data: { missionId: mission.id } });
            this.logger.log(`Devis signé ${quoteId} → mission créée ${mission.id}`);
          } else {
            await this.prisma.mission
              .update({
                where: { id: q.missionId },
                data: { agreedPrice: q.totalAmount, artisanId: q.artisanId },
              })
              .catch(() => undefined);
          }
        }
      } catch (err) {
        this.logger.error(
          `Conversion devis→mission (signature) échouée pour ${quoteId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }

      // La signature client vaut acceptation : on génère automatiquement la facture
      // rattachée au devis (createFromQuote bascule le devis en CONVERTED).
      // Non bloquant : un échec de facturation ne doit pas invalider la signature.
      try {
        await this.invoiceService.createFromQuote(quoteId);
        this.logger.log(`Invoice auto-generated from signed quote ${quoteId}`);
      } catch (err) {
        this.logger.error(
          `Auto-invoice generation failed for signed quote ${quoteId}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return {
      signatureId: signature.id,
      signedAt: signature.signedAt,
      documentHash: signature.documentHash,
    };
  }

  /**
   * Verify a signature
   */
  async verifySignature(signatureId: string): Promise<SignatureVerification> {
    const signature = await this.prisma.quoteSignature.findUnique({
      where: { id: signatureId },
      include: {
        quote: {
          include: {
            lineItems: true,
          },
        },
        signer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!signature) {
      throw new NotFoundException('Signature non trouvée');
    }

    // Regenerate document hash to verify integrity
    const currentHash = this.generateDocumentHash(signature.quote);
    const isHashValid = currentHash === signature.documentHash;

    return {
      isValid: signature.status === 'VALID' && isHashValid,
      signedAt: signature.signedAt,
      signedBy: `${signature.signer.firstName} ${signature.signer.lastName}`,
      documentHash: signature.documentHash,
      reason: !isHashValid ? 'Le document a été modifié après signature' : undefined,
    };
  }

  /**
   * Get all signatures for a quote
   */
  async getQuoteSignatures(quoteId: string): Promise<any[]> {
    const signatures = await this.prisma.quoteSignature.findMany({
      where: { quoteId },
      include: {
        signer: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { signedAt: 'asc' },
    });

    return signatures.map(sig => ({
      id: sig.id,
      signerRole: sig.signerRole,
      signerName: `${sig.signer.firstName} ${sig.signer.lastName}`,
      signedAt: sig.signedAt,
      signatureType: sig.signatureType,
      status: sig.status,
      hasImage: !!sig.signatureImage,
    }));
  }

  /**
   * Invalidate a signature (admin only)
   */
  async invalidateSignature(
    signatureId: string,
    adminId: string,
    reason: string,
  ): Promise<void> {
    const signature = await this.prisma.quoteSignature.findUnique({
      where: { id: signatureId },
    });

    if (!signature) {
      throw new NotFoundException('Signature non trouvée');
    }

    await this.prisma.quoteSignature.update({
      where: { id: signatureId },
      data: {
        status: 'INVALIDATED',
        invalidatedAt: new Date(),
        invalidatedBy: adminId,
        invalidationReason: reason,
      },
    });

    // Update quote status
    await this.prisma.quote.update({
      where: { id: signature.quoteId },
      data: { status: 'PENDING' },
    });

    this.logger.warn(`Signature ${signatureId} invalidated by ${adminId}: ${reason}`);
  }

  /**
   * Generate a secure hash of the document content
   */
  private generateDocumentHash(quote: any): string {
    const content = {
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      description: quote.description,
      lineItems: quote.lineItems?.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })) || [],
      subtotal: quote.subtotal?.toString(),
      taxRate: quote.taxRate?.toString(),
      taxAmount: quote.taxAmount?.toString(),
      totalAmount: quote.totalAmount?.toString(),
      validUntil: quote.validUntil?.toISOString(),
    };

    const hash = createHash('sha256');
    hash.update(JSON.stringify(content));
    return hash.digest('hex');
  }

  /**
   * Get legal text for signature consent
   */
  private getLegalText(signerRole: 'CLIENT' | 'ARTISAN'): string {
    if (signerRole === 'CLIENT') {
      return `En signant ce devis, je reconnais avoir pris connaissance de l'ensemble des conditions et accepte les termes proposés. Cette signature électronique a la même valeur juridique qu'une signature manuscrite conformément au règlement eIDAS et aux articles 1366 et 1367 du Code civil français.`;
    }
    return `Je certifie que ce devis reflète fidèlement les prestations proposées et les prix indiqués. Cette signature électronique engage ma responsabilité professionnelle conformément au règlement eIDAS.`;
  }

  /**
   * Request signature from client (send email)
   */
  async requestClientSignature(
    quoteId: string,
    artisanId: string,
    message?: string,
  ): Promise<{ signatureUrl: string }> {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { client: true, artisan: true },
    });

    if (!quote) {
      throw new NotFoundException('Devis non trouvé');
    }

    if (quote.artisanId !== artisanId) {
      throw new ForbiddenException('Non autorisé');
    }

    // Generate secure signature token
    const signatureToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days validity

    // Save signature request
    await this.prisma.quoteSignatureRequest.create({
      data: {
        quoteId,
        token: signatureToken,
        expiresAt,
        message,
      },
    });

    // Update quote status
    await this.prisma.quote.update({
      where: { id: quoteId },
      data: { status: 'SENT', sentAt: new Date() },
    });

    // Generate signature URL
    const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/quote/sign/${signatureToken}`;

    // Queue email notification (would integrate with email service)
    await this.prisma.emailQueue.create({
      data: {
        to: quote.client.email,
        subject: `Devis ${quote.quoteNumber} à signer - ${quote.artisan.firstName} ${quote.artisan.lastName}`,
        template: 'quote_signature_request',
        variables: {
          clientName: quote.client.firstName,
          artisanName: `${quote.artisan.firstName} ${quote.artisan.lastName}`,
          quoteNumber: quote.quoteNumber,
          quoteTitle: quote.title,
          totalAmount: quote.totalAmount,
          signatureUrl,
          message: message || '',
          expiresAt: expiresAt.toLocaleDateString('fr-FR'),
        },
        status: 'PENDING',
      },
    });

    this.logger.log(`Signature request sent for quote ${quoteId} to ${quote.client.email}`);

    return { signatureUrl };
  }

  /**
   * Get quote by signature token (for public signature page)
   */
  async getQuoteBySignatureToken(token: string): Promise<any> {
    const request = await this.prisma.quoteSignatureRequest.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: {
        quote: {
          include: {
            lineItems: { orderBy: { position: 'asc' } },
            artisan: {
              select: {
                firstName: true, lastName: true, email: true, phone: true,
                artisanProfile: { select: { companyName: true, siret: true } },
              },
            },
            client: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Lien de signature invalide ou expiré');
    }

    return {
      requestId: request.id,
      quote: request.quote,
      expiresAt: request.expiresAt,
      message: request.message,
    };
  }

  /**
   * Sign a quote via a public signature-request token.
   *
   * Sécurité :
   *  - vérifie que le signerEmail fourni correspond bien au client du devis
   *    (valeur probante eIDAS : on ne signe pas au nom d'un tiers) ;
   *  - marque la QuoteSignatureRequest `usedAt` après signature (anti-rejeu) :
   *    le token devient inutilisable même si le devis est repassé en PENDING.
   */
  async signQuoteByToken(
    token: string,
    data: {
      signatureImage?: string;
      signatureType: 'DRAWN' | 'TYPED' | 'CHECKBOX';
      signerName: string;
      signerEmail: string;
      ipAddress: string;
      userAgent: string;
    },
  ): Promise<{ signatureId: string; signedAt: Date; documentHash: string }> {
    const { requestId, quote } = await this.getQuoteBySignatureToken(token);

    // Le signataire doit être le client du devis (email vérifié, insensible à la casse).
    const clientEmail: string | undefined = quote?.client?.email;
    if (
      !clientEmail ||
      !data.signerEmail ||
      clientEmail.trim().toLowerCase() !== data.signerEmail.trim().toLowerCase()
    ) {
      throw new ForbiddenException(
        "L'email fourni ne correspond pas au destinataire du devis. La signature doit être effectuée par le client.",
      );
    }

    const result = await this.signQuote({
      quoteId: quote.id,
      signerId: quote.clientId,
      signerRole: 'CLIENT',
      signatureImage: data.signatureImage,
      signatureType: data.signatureType,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    // Anti-rejeu : consommer le token de signature.
    await this.prisma.quoteSignatureRequest.update({
      where: { id: requestId },
      data: { usedAt: new Date() },
    });

    return result;
  }
}
