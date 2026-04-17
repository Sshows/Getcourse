import { Injectable } from "@nestjs/common";
import { AuditActorType, AuditEventType, WebhookProvider, WebhookStatus } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { VideosService } from "../videos/videos.service";

@Injectable()
export class WebhooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly videosService: VideosService,
    private readonly auditService: AuditService
  ) {}

  async handleMux(payload: Record<string, any>, signature?: string) {
    const stored = await this.createOrReuseWebhookEvent(
      WebhookProvider.MUX,
      String(payload.type || "mux.unknown"),
      payload.id || null,
      signature,
      payload
    );

    await this.auditService.record({
      actorType: AuditActorType.SYSTEM,
      eventType: AuditEventType.WEBHOOK_RECEIVED,
      entityType: "webhook_event",
      entityId: stored.id,
      metadata: {
        provider: "MUX",
        eventType: stored.eventType
      }
    });

    try {
      const result = await this.videosService.applyMuxWebhook(payload, signature);
      await this.prisma.webhookEvent.update({
        where: { id: stored.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date()
        }
      });

      await this.auditService.record({
        actorType: AuditActorType.SYSTEM,
        eventType: AuditEventType.WEBHOOK_PROCESSED,
        entityType: "webhook_event",
        entityId: stored.id
      });

      return result;
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { id: stored.id },
        data: {
          status: WebhookStatus.ERROR,
          errorMessage: error instanceof Error ? error.message : "mux_webhook_failed"
        }
      });

      throw error;
    }
  }

  async handleCloudflare(payload: Record<string, any>, signature?: string) {
    const externalEventId = payload.uid || payload.result?.uid || null;
    const stored = await this.createOrReuseWebhookEvent(
      WebhookProvider.CLOUDFLARE_STREAM,
      String(payload.type || "cloudflare.stream"),
      externalEventId,
      signature,
      payload
    );

    await this.auditService.record({
      actorType: AuditActorType.SYSTEM,
      eventType: AuditEventType.WEBHOOK_RECEIVED,
      entityType: "webhook_event",
      entityId: stored.id,
      metadata: {
        provider: "CLOUDFLARE_STREAM",
        eventType: stored.eventType
      }
    });

    try {
      const result = await this.videosService.applyCloudflareWebhook(payload, signature);
      await this.prisma.webhookEvent.update({
        where: { id: stored.id },
        data: {
          status: WebhookStatus.PROCESSED,
          processedAt: new Date()
        }
      });

      await this.auditService.record({
        actorType: AuditActorType.SYSTEM,
        eventType: AuditEventType.WEBHOOK_PROCESSED,
        entityType: "webhook_event",
        entityId: stored.id
      });

      return result;
    } catch (error) {
      await this.prisma.webhookEvent.update({
        where: { id: stored.id },
        data: {
          status: WebhookStatus.ERROR,
          errorMessage: error instanceof Error ? error.message : "cloudflare_webhook_failed"
        }
      });

      throw error;
    }
  }

  private async createOrReuseWebhookEvent(
    provider: WebhookProvider,
    eventType: string,
    externalEventId: string | null,
    signature: string | undefined,
    payload: Record<string, any>
  ) {
    if (!externalEventId) {
      return this.prisma.webhookEvent.create({
        data: {
          provider,
          eventType,
          externalEventId: null,
          signature,
          payload
        }
      });
    }

    return this.prisma.webhookEvent.upsert({
      where: {
        provider_externalEventId: {
          provider,
          externalEventId
        }
      },
      create: {
        provider,
        eventType,
        externalEventId,
        signature,
        payload
      },
      update: {
        eventType,
        signature,
        payload
      }
    });
  }
}
