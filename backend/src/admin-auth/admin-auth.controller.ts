import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { AdminAuthService } from "./admin-auth.service";
import { AdminSessionGuard } from "./admin-session.guard";
import { LoginAdminDto } from "./dto/login-admin.dto";

@Controller("admin-auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  login(@Body() dto: LoginAdminDto, @Req() request: any) {
    return this.adminAuthService.login(dto, {
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"]
    });
  }

  @Get("me")
  @UseGuards(AdminSessionGuard)
  getSession(@Req() request: any) {
    return this.adminAuthService.getSessionView(request.adminSession.id);
  }

  @Post("logout")
  @UseGuards(AdminSessionGuard)
  logout(@Req() request: any) {
    return this.adminAuthService.logout(request.adminSession.id);
  }
}
