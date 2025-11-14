import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({
    description: 'FCM device token',
    example: 'dQw4w9WgXcQ:APA91bE...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class UnregisterTokenDto {
  @ApiProperty({
    description: 'FCM device token to unregister',
    example: 'dQw4w9WgXcQ:APA91bE...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class SendNotificationDto {
  @ApiProperty({
    description: 'Notification title',
    example: 'New Message',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Notification body',
    example: 'You have a new message from John',
  })
  @IsString()
  @IsNotEmpty()
  body: string;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { conversationId: '123', type: 'message' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, string>;
}
