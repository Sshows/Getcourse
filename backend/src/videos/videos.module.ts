import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SessionsModule } from "../sessions/sessions.module";
import { VideosController } from "./videos.controller";
import { VideosService } from "./videos.service";

@Module({
  imports: [AuditModule, SessionsModule],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService]
})
export class VideosModule {}
