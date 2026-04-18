import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { AdminAuthService } from "./admin-auth.service";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const rawSessionId = request.headers["x-admin-session-id"];
    const sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId;

    if (!sessionId || typeof sessionId !== "string") {
      throw new UnauthorizedException("Admin session is required.");
    }

    const session = await this.adminAuthService.assertAdminSession(sessionId);
    request.adminUser = session.user;
    request.adminSession = session;

    return true;
  }
}
