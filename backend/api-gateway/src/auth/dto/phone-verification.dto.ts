import { IsString, Matches, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendPhoneCodeDto {
  @ApiProperty({ example: '+352661234567' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Numéro de téléphone invalide' })
  phone: string;
}

export class VerifyPhoneCodeDto {
  @ApiProperty({ example: '+352661234567' })
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, { message: 'Numéro de téléphone invalide' })
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6, { message: 'Le code doit contenir 6 chiffres' })
  @Matches(/^\d{6}$/, { message: 'Le code doit être composé de 6 chiffres' })
  code: string;
}
