import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { VideosModule } from "../videos/videos.module";
import { WebhooksController } from "./webhooks.controller";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [AuditModule, VideosModule],
  controllers: [WebhooksController],
  providers: [WebhooksService]
})
export class WebhooksModule {}
