import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SessionsModule } from "../sessions/sessions.module";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";

@Module({
  imports: [AuditModule, SessionsModule],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService]
})
export class AccessModule {}
