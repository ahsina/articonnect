import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * DTO pour une annonce plateforme diffusée par un administrateur.
 * Réutilise l'infrastructure Notification existante (type SYSTEM) : chaque
 * utilisateur (ou d'un rôle donné) reçoit une notification persistante + un
 * push temps réel via le NotificationGateway.
 */
export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(1000)
  message: string;

  /** Lien optionnel ouvert au clic sur la notification (ex: /maintenance). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  /**
   * Public visé. ALL = tous les utilisateurs actifs (défaut).
   * CLIENT / ARTISAN = uniquement ce rôle.
   */
  @IsOptional()
  @IsIn(['ALL', 'CLIENT', 'ARTISAN'])
  audience?: 'ALL' | 'CLIENT' | 'ARTISAN';
}
