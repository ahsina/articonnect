import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token from email',
    example: 'abc123def456'
  })
  @IsString()
  @IsNotEmpty()
  invitationToken: string;
}
