import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsObject,
  ValidateNested,
  IsEnum,
  IsDate,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour une tentative de contact
 */
export class ContactAttemptDto {
  @ApiProperty({
    description: 'Timestamp de la tentative',
    example: '2025-11-08T14:30:00Z',
  })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({
    description: 'Méthode de contact',
    enum: ['PHONE_CALL', 'SMS', 'APP_MESSAGE'],
    example: 'PHONE_CALL',
  })
  @IsEnum(['PHONE_CALL', 'SMS', 'APP_MESSAGE'])
  method: 'PHONE_CALL' | 'SMS' | 'APP_MESSAGE';

  @ApiProperty({
    description: 'Succès de la tentative',
    example: false,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Notes sur la tentative',
    example: 'Pas de réponse',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO pour les coordonnées GPS
 */
export class GpsCoordsDto {
  @ApiProperty({
    description: 'Latitude',
    example: 49.6116,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  latitude: number;

  @ApiProperty({
    description: 'Longitude',
    example: 6.1319,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  longitude: number;

  @ApiProperty({
    description: 'Précision en mètres',
    example: 10,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  accuracy: number;
}

/**
 * DTO pour signaler un no-show
 */
export class ReportNoShowDto {
  @ApiProperty({
    description: 'ID de la mission',
    example: 'uuid-mission-123',
  })
  @IsString()
  missionId: string;

  @ApiProperty({
    description: 'Heure d\'arrivée de l\'artisan',
    example: '2025-11-08T14:00:00Z',
  })
  @IsDate()
  @Type(() => Date)
  arrivalTime: Date;

  @ApiProperty({
    description: 'Durée d\'attente en minutes (minimum 15)',
    example: 20,
    minimum: 15,
  })
  @IsNumber()
  @Min(15)
  waitDurationMinutes: number;

  @ApiProperty({
    description: 'Tentatives de contact (minimum 2)',
    type: [ContactAttemptDto],
    minItems: 2,
  })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => ContactAttemptDto)
  contactAttempts: ContactAttemptDto[];

  @ApiProperty({
    description: 'URLs des photos de preuve (minimum 1)',
    type: [String],
    example: ['https://s3.amazonaws.com/proof1.jpg', 'https://s3.amazonaws.com/proof2.jpg'],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  proofPhotos: string[];

  @ApiProperty({
    description: 'Coordonnées GPS de l\'emplacement',
    type: GpsCoordsDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => GpsCoordsDto)
  gpsCoords: GpsCoordsDto;
}

/**
 * DTO pour valider un no-show (admin)
 */
export class ValidateNoShowDto {
  @ApiProperty({
    description: 'ID de l\'événement no-show',
    example: 'uuid-noshow-123',
  })
  @IsString()
  noShowEventId: string;

  @ApiPropertyOptional({
    description: 'Notes de l\'admin',
    example: 'Preuves validées, client bien absent',
  })
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

/**
 * DTO pour rejeter un no-show (admin)
 */
export class RejectNoShowDto {
  @ApiProperty({
    description: 'ID de l\'événement no-show',
    example: 'uuid-noshow-123',
  })
  @IsString()
  noShowEventId: string;

  @ApiProperty({
    description: 'Raison du rejet',
    example: 'Client était présent, preuves insuffisantes',
  })
  @IsString()
  reason: string;
}

/**
 * DTO pour la réponse de no-show
 */
export class NoShowResponseDto {
  @ApiProperty({
    description: 'Événement no-show créé',
  })
  noShowEvent: any;

  @ApiProperty({
    description: 'Validation automatique effectuée',
    example: true,
  })
  autoValidated: boolean;

  @ApiProperty({
    description: 'Message de confirmation',
    example: 'No-show validé - Client pénalisé, artisan compensé',
  })
  message: string;
}
