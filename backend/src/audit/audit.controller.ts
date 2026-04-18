import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AdminSessionGuard } from "../admin-auth/admin-session.guard";
import { AuditService } from "./audit.service";

@Controller("admin/audit-logs")
@UseGuards(AdminSessionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query("eventType") eventType?: string) {
    return this.auditService.list(eventType);
  }
}
