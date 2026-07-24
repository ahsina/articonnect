import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  IsNotEmpty,
  MinLength,
  Min,
  Max,
  ValidateIf,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MissionType, MissionStatus } from '@prisma/client';

/**
 * Custom validator: rejects a date that is not strictly in the future.
 * Applied only when the value is provided (combine with @IsOptional).
 * Prevents scheduling a mission for a past/current instant (client-05).
 */
function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) {
            // Optionality is handled by @IsOptional; nothing to validate here.
            return true;
          }
          const date = new Date(value as string | number | Date);
          if (isNaN(date.getTime())) {
            // Invalid date format is reported by @IsDateString, not here.
            return true;
          }
          return date.getTime() > Date.now();
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} doit être une date dans le futur`;
        },
      },
    });
  };
}

export class CreateMissionDto {
  @ApiProperty({
    enum: MissionType,
    enumName: 'MissionType',
    example: MissionType.SCHEDULED,
    description:
      "Type de mission. Valeurs valides : EMERGENCY (intervention urgente), SCHEDULED (planifiée) " +
      "ou QUOTE (sur devis). Toute autre valeur (ex 'STANDARD') est rejetée par 400.",
  })
  @IsEnum(MissionType)
  type: MissionType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({
    description:
      "Description de la demande. Obligatoire (min. 20 caractères) pour les types QUOTE et " +
      "SCHEDULED afin que les artisans puissent chiffrer correctement ; facultative pour EMERGENCY " +
      "(le métier + l'adresse suffisent à déclencher une intervention urgente).",
  })
  // Détails requis (≥20 car.) sauf urgence : @ValidateIf court-circuite toute validation
  // du champ quand type === EMERGENCY, autorisant alors une description vide/absente.
  @ValidateIf((o) => o.type !== MissionType.EMERGENCY)
  @IsString()
  @IsNotEmpty({ message: 'La description est obligatoire.' })
  @MinLength(20, { message: 'La description doit contenir au moins 20 caractères.' })
  description: string;

  @ApiProperty()
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  address: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  postalCode: string;

  @ApiProperty({ enum: ['LU', 'FR', 'BE'] })
  @IsString()
  country: string;

  @ApiProperty()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({
    required: false,
    description:
      'Date/heure planifiée (ISO 8601). Doit être strictement dans le futur ' +
      'lorsqu\'elle est fournie, sinon 400.',
  })
  @IsOptional()
  @IsDateString()
  @IsFutureDate()
  scheduledFor?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  clientBudget?: number;

  @ApiProperty({ required: false, description: 'Legacy photos field' })
  @IsOptional()
  @IsArray()
  photos?: string[];

  @ApiProperty({ required: false, description: 'Photos taken before the work (by client)' })
  @IsOptional()
  @IsArray()
  beforePhotos?: string[];

  @ApiProperty({ required: false, description: 'Photos taken after the work (by artisan)' })
  @IsOptional()
  @IsArray()
  afterPhotos?: string[];

  // B2B Billing fields
  @ApiProperty({ required: false, description: 'Purchase order number for B2B clients' })
  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @ApiProperty({ required: false, description: 'Internal reference for B2B clients' })
  @IsOptional()
  @IsString()
  internalReference?: string;

  @ApiProperty({ required: false, description: 'Billing company name if different from client' })
  @IsOptional()
  @IsString()
  billingCompanyName?: string;

  @ApiProperty({ required: false, description: 'Billing address if different from mission address' })
  @IsOptional()
  @IsString()
  billingAddress?: string;

  @ApiProperty({ required: false, description: 'Billing VAT number' })
  @IsOptional()
  @IsString()
  billingVatNumber?: string;
}

export class UpdateMissionStatusDto {
  @ApiProperty({ enum: MissionStatus })
  @IsEnum(MissionStatus)
  status: MissionStatus;

  @ApiProperty({ required: false, description: 'Optional note about the status change' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AddMissionPhotosDto {
  @ApiProperty({ required: false, description: 'Photos to add to before photos array' })
  @IsOptional()
  @IsArray()
  beforePhotos?: string[];

  @ApiProperty({ required: false, description: 'Photos to add to after photos array' })
  @IsOptional()
  @IsArray()
  afterPhotos?: string[];
}
