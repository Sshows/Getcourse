import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminSessionGuard } from "./admin-session.guard";

@Module({
  imports: [AuditModule],
  controllers: [AdminAuthController],
  providers: [AdminAuthService, AdminSessionGuard],
  exports: [AdminAuthService, AdminSessionGuard]
})
export class AdminAuthModule {}
