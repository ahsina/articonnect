import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/services/email.service';
import { NotificationService } from '../../notification/services/notification.service';

interface ExpiringCertification {
  id: string;
  name: string;
  issuer: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  artisan: {
    id: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

@Injectable()
export class CertificationNotificationService {
  private readonly logger = new Logger(CertificationNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Run daily at 9:00 AM to check for expiring certifications
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkExpiringCertifications() {
    this.logger.log('Running certification expiration check...');

    const now = new Date();
    const notificationPeriods = [
      { days: 30, type: '30_DAYS' },
      { days: 15, type: '15_DAYS' },
      { days: 7, type: '7_DAYS' },
      { days: 1, type: '1_DAY' },
    ];

    for (const period of notificationPeriods) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + period.days);

      // Find certifications expiring on this exact date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const expiringCerts = await this.prisma.certification.findMany({
        where: {
          expiryDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          verified: true,
        },
        include: {
          artisan: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      for (const cert of expiringCerts) {
        await this.sendExpirationNotification(cert, period.days, period.type);
      }

      this.logger.log(
        `Found ${expiringCerts.length} certifications expiring in ${period.days} days`,
      );
    }

    // Also check for already expired certifications (notification once)
    await this.checkExpiredCertifications();
  }

  /**
   * Check for certifications that have already expired
   */
  private async checkExpiredCertifications() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const justExpired = await this.prisma.certification.findMany({
      where: {
        expiryDate: {
          gte: yesterday,
          lt: today,
        },
        verified: true,
      },
      include: {
        artisan: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    for (const cert of justExpired) {
      await this.sendExpiredNotification(cert);

      // Mark certification as unverified when expired
      await this.prisma.certification.update({
        where: { id: cert.id },
        data: { verified: false },
      });
    }

    this.logger.log(`Found ${justExpired.length} certifications that just expired`);
  }

  /**
   * Send expiration warning notification
   */
  private async sendExpirationNotification(
    cert: any,
    daysUntilExpiry: number,
    notificationType: string,
  ) {
    const { artisan } = cert;
    const { user } = artisan;

    // Check if notification was already sent for this period
    const existingNotification = await this.prisma.notification.findFirst({
      where: {
        userId: user.id,
        type: 'CERTIFICATION_EXPIRING',
        metadata: {
          path: ['certificationId'],
          equals: cert.id,
        },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    if (existingNotification) {
      return; // Already notified today
    }

    // Create in-app notification
    await this.notificationService.createNotification(
      user.id,
      'CERTIFICATION_EXPIRING',
      this.getExpirationTitle(daysUntilExpiry),
      this.getExpirationMessage(cert.name, daysUntilExpiry),
      '/artisan/certifications',
      {
        certificationId: cert.id,
        certificationName: cert.name,
        daysUntilExpiry,
        notificationType,
      },
    );

    // Send email notification
    try {
      await this.emailService.sendEmail(
        user.email,
        this.getEmailSubject(cert.name, daysUntilExpiry),
        this.getExpirationEmailHtml(user.firstName, cert.name, cert.issuer, daysUntilExpiry, cert.expiryDate),
      );
    } catch (error) {
      this.logger.error(`Failed to send expiration email to ${user.email}:`, error);
    }
  }

  /**
   * Send notification for already expired certification
   */
  private async sendExpiredNotification(cert: any) {
    const { artisan } = cert;
    const { user } = artisan;

    // Create in-app notification
    await this.notificationService.createNotification(
      user.id,
      'CERTIFICATION_EXPIRED',
      'Certification expirée',
      `Votre certification "${cert.name}" a expiré. Veuillez la renouveler pour maintenir votre statut vérifié.`,
      '/artisan/certifications',
      {
        certificationId: cert.id,
        certificationName: cert.name,
      },
    );

    // Send email notification
    try {
      await this.emailService.sendEmail(
        user.email,
        `⚠️ Certification expirée: ${cert.name}`,
        this.getExpiredEmailHtml(user.firstName, cert.name, cert.issuer),
      );
    } catch (error) {
      this.logger.error(`Failed to send expired email to ${user.email}:`, error);
    }
  }

  private getExpirationTitle(days: number): string {
    if (days === 1) return '⚠️ Certification expire demain !';
    if (days <= 7) return `⚠️ Certification expire dans ${days} jours`;
    return `📋 Certification expire dans ${days} jours`;
  }

  private getExpirationMessage(certName: string, days: number): string {
    if (days === 1) {
      return `Votre certification "${certName}" expire demain. Pensez à la renouveler pour maintenir votre profil vérifié.`;
    }
    return `Votre certification "${certName}" expire dans ${days} jours. Pensez à la renouveler à temps.`;
  }

  private getEmailSubject(certName: string, days: number): string {
    if (days === 1) return `⚠️ URGENT: Certification "${certName}" expire demain`;
    if (days <= 7) return `⚠️ Rappel: Certification "${certName}" expire dans ${days} jours`;
    return `📋 Rappel: Certification "${certName}" expire dans ${days} jours`;
  }

  private getExpirationEmailHtml(
    firstName: string,
    certName: string,
    issuer: string,
    days: number,
    expiryDate: Date,
  ): string {
    const urgencyColor = days <= 7 ? '#dc2626' : '#f59e0b';
    const formattedDate = expiryDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert-box { background: ${urgencyColor}15; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; }
    .cert-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎓 Rappel de Certification</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName}</strong>,</p>

      <div class="alert-box">
        <strong>${days === 1 ? '⚠️ URGENT' : '📅 Rappel'}:</strong> Votre certification expire ${days === 1 ? 'demain' : `dans ${days} jours`}.
      </div>

      <div class="cert-info">
        <p><strong>Certification:</strong> ${certName}</p>
        <p><strong>Organisme:</strong> ${issuer}</p>
        <p><strong>Date d'expiration:</strong> ${formattedDate}</p>
      </div>

      <p>Pour maintenir votre statut de professionnel certifié sur ArtiConnect, nous vous recommandons de renouveler cette certification avant son expiration.</p>

      <p><strong>Pourquoi c'est important ?</strong></p>
      <ul>
        <li>Les clients préfèrent les artisans avec des certifications valides</li>
        <li>Votre badge "Certifié" sera retiré après expiration</li>
        <li>Certaines missions peuvent exiger des certifications valides</li>
      </ul>

      <a href="${process.env.FRONTEND_URL || 'https://articonnect.lu'}/artisan/certifications" class="btn">
        Gérer mes certifications
      </a>
    </div>
    <div class="footer">
      <p>ArtiConnect - La plateforme des artisans au Luxembourg</p>
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private getExpiredEmailHtml(firstName: string, certName: string, issuer: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .alert-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
    .cert-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">⚠️ Certification Expirée</h1>
    </div>
    <div class="content">
      <p>Bonjour <strong>${firstName}</strong>,</p>

      <div class="alert-box">
        <strong>Votre certification a expiré</strong> et votre badge "Certifié" a été temporairement retiré de votre profil.
      </div>

      <div class="cert-info">
        <p><strong>Certification:</strong> ${certName}</p>
        <p><strong>Organisme:</strong> ${issuer}</p>
        <p><strong>Statut:</strong> <span style="color: #dc2626;">Expirée</span></p>
      </div>

      <p><strong>Actions recommandées:</strong></p>
      <ol>
        <li>Contactez l'organisme de certification pour le renouvellement</li>
        <li>Obtenez votre nouveau certificat</li>
        <li>Téléchargez-le sur votre profil ArtiConnect</li>
      </ol>

      <p>Une fois votre nouvelle certification téléchargée, notre équipe la vérifiera rapidement pour rétablir votre badge.</p>

      <a href="${process.env.FRONTEND_URL || 'https://articonnect.lu'}/artisan/certifications" class="btn">
        Mettre à jour ma certification
      </a>
    </div>
    <div class="footer">
      <p>ArtiConnect - La plateforme des artisans au Luxembourg</p>
      <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Get summary of certifications expiring soon for admin dashboard
   */
  async getExpiringSummary(): Promise<{
    expiring30Days: number;
    expiring15Days: number;
    expiring7Days: number;
    expired: number;
  }> {
    const now = new Date();

    const [expiring30Days, expiring15Days, expiring7Days, expired] = await Promise.all([
      this.prisma.certification.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
          verified: true,
        },
      }),
      this.prisma.certification.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          },
          verified: true,
        },
      }),
      this.prisma.certification.count({
        where: {
          expiryDate: {
            gte: now,
            lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
          },
          verified: true,
        },
      }),
      this.prisma.certification.count({
        where: {
          expiryDate: {
            lt: now,
          },
        },
      }),
    ]);

    return { expiring30Days, expiring15Days, expiring7Days, expired };
  }
}
