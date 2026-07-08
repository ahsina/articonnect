import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';

class SendMessageHttpDto {
  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiProperty({ required: false, description: 'Mission liée éventuelle' })
  @IsOptional()
  @IsString()
  missionId?: string;
}

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all conversations' })
  async getConversations(@Request() req) {
    return this.chatService.getConversations(req.user.userId);
  }

  @Get('conversation/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation with specific user' })
  async getConversation(
    @Request() req,
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getConversation(
      req.user.userId,
      userId,
      limit ? Number(limit) : 50,
    );
  }

  @Post('conversation/:userId/message')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Envoyer un message (fallback HTTP quand le WebSocket est indisponible)' })
  async sendMessage(
    @Request() req,
    @Param('userId') userId: string,
    @Body() body: SendMessageHttpDto,
  ) {
    if (!userId || userId === req.user.userId) {
      throw new BadRequestException('Destinataire invalide');
    }
    // Même logique que l'event WS `send_message` : création du message chiffré via chatService.
    const message = await this.chatService.createMessage({
      senderId: req.user.userId,
      receiverId: userId,
      content: body.content,
      missionId: body.missionId,
    });
    return {
      id: message.id,
      senderId: req.user.userId,
      receiverId: userId,
      missionId: body.missionId,
      createdAt: message.createdAt,
      read: false,
    };
  }

  @Post('conversation/:userId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markConversationAsRead(@Request() req, @Param('userId') userId: string) {
    await this.chatService.markConversationAsRead(req.user.userId, userId);
    return { success: true };
  }

  @Delete('message/:messageId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete message' })
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.chatService.deleteMessage(messageId, req.user.userId);
    return { success: true };
  }
}
