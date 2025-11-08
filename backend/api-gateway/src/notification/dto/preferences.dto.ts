import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newMission?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  missionUpdate?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newMessage?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  paymentReceived?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  paymentSent?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  reviewReceived?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  marketingEmails?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  weeklyDigest?: boolean;
}
