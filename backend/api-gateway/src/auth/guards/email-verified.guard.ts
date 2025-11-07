import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // Get user from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { emailVerified: true },
    });

    if (!dbUser) {
      throw new UnauthorizedException('Utilisateur introuvable');
    }

    if (!dbUser.emailVerified) {
      throw new UnauthorizedException(
        'Veuillez vérifier votre adresse email avant de continuer'
      );
    }

    return true;
  }
}
