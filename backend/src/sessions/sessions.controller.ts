import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { HeartbeatSessionDto } from "./dto/heartbeat-session.dto";
import { RevokeSessionDto } from "./dto/revoke-session.dto";
import { SessionsService } from "./sessions.service";

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get("admin/sessions")
  listAdminSessions() {
    return this.sessionsService.listActiveSessions();
  }

  @Post("admin/sessions/:sessionId/revoke")
  revokeSession(@Param("sessionId") sessionId: string, @Body() dto: RevokeSessionDto) {
    return this.sessionsService.revokeSession(sessionId, dto.reason || "revoked_by_admin");
  }

  @Post("session/heartbeat")
  heartbeat(@Body() dto: HeartbeatSessionDto) {
    return this.sessionsService.heartbeat(dto.userId, dto.sessionId);
  }
}
