import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { InternalChatService } from '../services/internal-chat.service';

class CreateRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['DIRECT', 'GROUP', 'TEAM', 'MISSION', 'ANNOUNCEMENT'])
  type: 'DIRECT' | 'GROUP' | 'TEAM' | 'MISSION' | 'ANNOUNCEMENT';

  @IsOptional()
  @IsString()
  companyId?: string;

  @IsOptional()
  @IsString()
  missionId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}

interface SendMessageDto {
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE_NOTE';
  replyToId?: string;
  mentions?: string[];
}

interface UpdateRoomDto {
  name?: string;
  description?: string;
  avatar?: string;
}

/**
 * Internal Chat Controller
 * Handles company-internal group chats, team channels, and mission-specific conversations
 */
@Controller('internal-chat')
@UseGuards(JwtAuthGuard)
export class InternalChatController {
  constructor(private readonly chatService: InternalChatService) {}

  // ============ ROOMS ============

  @Post('rooms')
  async createRoom(@Request() req, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(req.user.id, dto);
  }

  @Get('rooms')
  async getRooms(@Request() req, @Query('companyId') companyId?: string) {
    return this.chatService.getUserRooms(req.user.id, companyId);
  }

  @Get('rooms/company/:companyId')
  async getCompanyRooms(@Request() req, @Param('companyId') companyId: string) {
    return this.chatService.getCompanyRooms(req.user.id, companyId);
  }

  @Get('rooms/:roomId')
  async getRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.chatService.getRoom(roomId, req.user.id);
  }

  @Put('rooms/:roomId')
  async updateRoom(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body() dto: UpdateRoomDto,
  ) {
    return this.chatService.updateRoom(roomId, req.user.id, dto);
  }

  @Post('rooms/:roomId/archive')
  async archiveRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.chatService.archiveRoom(roomId, req.user.id);
    return { success: true };
  }

  @Post('rooms/:roomId/pin')
  async togglePinRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.chatService.togglePinRoom(roomId, req.user.id);
  }

  @Post('rooms/:roomId/mute')
  async toggleMuteRoom(@Request() req, @Param('roomId') roomId: string) {
    return this.chatService.toggleMuteRoom(roomId, req.user.id);
  }

  @Post('rooms/:roomId/leave')
  async leaveRoom(@Request() req, @Param('roomId') roomId: string) {
    await this.chatService.leaveRoom(roomId, req.user.id);
    return { success: true };
  }

  // ============ MEMBERS ============

  @Post('rooms/:roomId/members')
  async addMembers(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body('memberIds') memberIds: string[],
  ) {
    return this.chatService.addMembers(roomId, req.user.id, memberIds);
  }

  @Delete('rooms/:roomId/members/:memberId')
  async removeMember(
    @Request() req,
    @Param('roomId') roomId: string,
    @Param('memberId') memberId: string,
  ) {
    await this.chatService.removeMember(roomId, req.user.id, memberId);
    return { success: true };
  }

  @Get('company/:companyId/members')
  async getCompanyMembers(
    @Request() req,
    @Param('companyId') companyId: string,
  ) {
    return this.chatService.getCompanyMembers(req.user.id, companyId);
  }

  // ============ MESSAGES ============

  @Get('rooms/:roomId/messages')
  async getMessages(
    @Request() req,
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ) {
    return this.chatService.getMessages(
      roomId,
      req.user.id,
      limit ? parseInt(limit, 10) : 50,
      before,
    );
  }

  @Post('rooms/:roomId/messages')
  async sendMessage(
    @Request() req,
    @Param('roomId') roomId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(roomId, req.user.id, dto);
  }

  @Put('messages/:messageId')
  async editMessage(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.editMessage(messageId, req.user.id, content);
  }

  @Delete('messages/:messageId')
  async deleteMessage(@Request() req, @Param('messageId') messageId: string) {
    await this.chatService.deleteMessage(messageId, req.user.id);
    return { success: true };
  }

  // ============ REACTIONS ============

  @Post('messages/:messageId/reactions')
  async addReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Body('emoji') emoji: string,
  ) {
    return this.chatService.addReaction(messageId, req.user.id, emoji);
  }

  @Delete('messages/:messageId/reactions/:emoji')
  async removeReaction(
    @Request() req,
    @Param('messageId') messageId: string,
    @Param('emoji') emoji: string,
  ) {
    return this.chatService.removeReaction(messageId, req.user.id, emoji);
  }

  // ============ SEARCH ============

  @Get('rooms/:roomId/search')
  async searchMessages(
    @Request() req,
    @Param('roomId') roomId: string,
    @Query('q') query: string,
  ) {
    return this.chatService.searchMessages(roomId, req.user.id, query);
  }
}
