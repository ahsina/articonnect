import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Guard « compte vérifié » — exige que l'email ET le téléphone soient vérifiés.
 *
 * Défense en profondeur du mur d'onboarding bloquant (le front redirige déjà l'utilisateur
 * non vérifié vers /onboarding/verify). Ce guard empêche tout contournement de l'API sur les
 * actions clés : publier une demande (client), envoyer/accepter une offre (artisan), payer.
 *
 * Renvoie un 403 structuré ({ code, redirectUrl, need }) que le front intercepte pour
 * rediriger vers l'étape de vérification manquante.
 */
@Injectable()
export class AccountVerifiedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { phone: true, emailVerified: true, phoneVerified: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (!dbUser.emailVerified) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Veuillez vérifier votre adresse email avant de continuer',
        need: 'email',
        redirectUrl: '/onboarding/verify',
      });
    }

    if (!dbUser.phone) {
      throw new ForbiddenException({
        code: 'PHONE_REQUIRED',
        message: 'Un numéro de téléphone vérifié est requis pour cette action',
        need: 'phone',
        redirectUrl: '/onboarding/verify',
      });
    }

    if (!dbUser.phoneVerified) {
      throw new ForbiddenException({
        code: 'PHONE_NOT_VERIFIED',
        message: 'Veuillez vérifier votre numéro de téléphone avant de continuer',
        need: 'phone',
        redirectUrl: '/onboarding/verify',
      });
    }

    return true;
  }
}
