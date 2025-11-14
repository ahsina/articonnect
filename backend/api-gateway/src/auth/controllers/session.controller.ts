import { Controller, Get, Delete, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { SessionService } from '../services/session.service';

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  async getMySessions(@Request() req) {
    const sessions = await this.sessionService.getUserSessions(req.user.userId);
    return { sessions };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get current session info' })
  async getCurrentSession(@Request() req) {
    const session = await this.sessionService.getSession(req.user.sessionId);
    return { session };
  }

  @Delete(':sessionId')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Request() req, @Param('sessionId') sessionId: string) {
    const sessions = await this.sessionService.getUserSessions(req.user.userId);
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession || targetSession.userId !== req.user.userId) {
      return { message: 'Session not found or unauthorized' };
    }

    await this.sessionService.revokeSession(sessionId);
    return { message: 'Session revoked successfully' };
  }

  @Delete('all/except-current')
  @ApiOperation({ summary: 'Revoke all sessions except the current one' })
  async revokeAllExceptCurrent(@Request() req) {
    await this.sessionService.revokeAllSessionsExcept(
      req.user.userId,
      req.user.sessionId,
    );
    return { message: 'All other sessions revoked successfully' };
  }

  @Delete('all')
  @ApiOperation({ summary: 'Revoke all sessions (logout from all devices)' })
  async revokeAllSessions(@Request() req) {
    await this.sessionService.revokeAllSessions(req.user.userId);
    return { message: 'All sessions revoked successfully' };
  }
}
