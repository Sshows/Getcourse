import { Controller, Get, Query } from "@nestjs/common";
import { AuditService } from "./audit.service";

@Controller("admin/audit-logs")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query("eventType") eventType?: string) {
    return this.auditService.list(eventType);
  }
}
