import { Controller, Get, Post, Delete, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatService } from '../services/chat.service';

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
