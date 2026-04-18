import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuditActorType } from "@prisma/client";
import { AdminSessionGuard } from "../admin-auth/admin-session.guard";
import { HeartbeatSessionDto } from "./dto/heartbeat-session.dto";
import { RevokeSessionDto } from "./dto/revoke-session.dto";
import { SessionsService } from "./sessions.service";

@Controller()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get("admin/sessions")
  @UseGuards(AdminSessionGuard)
  listAdminSessions() {
    return this.sessionsService.listActiveSessions();
  }

  @Post("admin/sessions/:sessionId/revoke")
  @UseGuards(AdminSessionGuard)
  revokeSession(@Param("sessionId") sessionId: string, @Body() dto: RevokeSessionDto, @Req() request: any) {
    return this.sessionsService.revokeSession(sessionId, dto.reason || "revoked_by_admin", {
      actorId: request.adminUser.id,
      actorType: AuditActorType.ADMIN
    });
  }

  @Post("session/heartbeat")
  heartbeat(@Body() dto: HeartbeatSessionDto) {
    return this.sessionsService.heartbeat(dto.userId, dto.sessionId);
  }
}
