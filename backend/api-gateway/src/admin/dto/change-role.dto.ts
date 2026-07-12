import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

/**
 * DTO pour le changement de rôle d'un utilisateur par un administrateur.
 * Le rôle DOIT être une valeur de l'enum UserRole (CLIENT | ARTISAN | ADMIN).
 */
export class ChangeRoleDto {
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;
}
