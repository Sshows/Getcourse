import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { AuditActorType, AuditEventType, Prisma, VideoAssetStatus, VideoProvider } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { createRs256Jwt } from "../common/utils/jwt.util";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import { CreateUploadIntentDto } from "./dto/create-upload-intent.dto";

type UploadIntent = {
  provider: VideoProvider;
  externalUploadId: string;
  uploadUrl: string;
};

@Injectable()
export class VideosService {
  private readonly playbackTokenTtlSeconds = Number(process.env.PLAYBACK_TOKEN_TTL_SECONDS || 900);
  private readonly allowDevVideoFallback =
    String(process.env.ALLOW_INSECURE_DEV_VIDEO_FALLBACK || "false").toLowerCase() === "true";

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
    private readonly auditService: AuditService
  ) {}

  async listAssets() {
    return this.prisma.videoAsset.findMany({
      include: {
        lesson: {
          include: {
            course: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createUploadIntent(dto: CreateUploadIntentDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: dto.lessonId },
      include: { course: true }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found.");
    }

    const provider = dto.provider || (process.env.DEFAULT_VIDEO_PROVIDER as VideoProvider) || VideoProvider.MUX;
    const intent = await this.requestUploadIntent(provider, dto);

    const asset = await this.prisma.videoAsset.upsert({
      where: { lessonId: dto.lessonId },
      update: {
        provider,
        externalUploadId: intent.externalUploadId,
        uploadUrl: intent.uploadUrl,
        status: VideoAssetStatus.UPLOADING,
        originalFileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        errorMessage: null
      },
      create: {
        lessonId: dto.lessonId,
        provider,
        externalUploadId: intent.externalUploadId,
        uploadUrl: intent.uploadUrl,
        status: VideoAssetStatus.UPLOADING,
        originalFileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        playbackPolicy: "signed"
      }
    });

    await this.auditService.record({
      actorType: AuditActorType.ADMIN,
      eventType: AuditEventType.VIDEO_UPLOAD_INTENT_CREATED,
      entityType: "video_asset",
      entityId: asset.id,
      metadata: {
        lessonId: dto.lessonId,
        provider,
        fileName: dto.fileName
      }
    });

    return {
      assetId: asset.id,
      provider,
      uploadUrl: intent.uploadUrl,
      externalUploadId: intent.externalUploadId
    };
  }

  async createPlaybackAccess(userId: string, sessionId: string, lessonId: string) {
    await this.sessionsService.assertActiveSession(userId, sessionId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        course: true,
        videoAsset: true
      }
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found.");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        courseId: lesson.courseId,
        status: "ACTIVE"
      }
    });

    if (!enrollment) {
      await this.auditService.record({
        actorId: userId,
        actorType: AuditActorType.USER,
        eventType: AuditEventType.PLAYBACK_ACCESS_DENIED,
        entityType: "lesson",
        entityId: lessonId,
        sessionId
      });
      throw new UnauthorizedException("User is not enrolled into this course.");
    }

    if (!lesson.videoAsset || lesson.videoAsset.status !== VideoAssetStatus.READY) {
      throw new BadRequestException("Video asset is not ready for playback.");
    }

    const access =
      lesson.videoAsset.provider === VideoProvider.MUX
        ? await this.createMuxPlaybackAccess(lesson.videoAsset.playbackId, sessionId, userId)
        : await this.createCloudflarePlaybackAccess(lesson.videoAsset.externalAssetId);

    await this.auditService.record({
      actorId: userId,
      actorType: AuditActorType.USER,
      eventType: AuditEventType.PLAYBACK_ACCESS_GRANTED,
      entityType: "video_asset",
      entityId: lesson.videoAsset.id,
      sessionId,
      metadata: {
        lessonId
      }
    });

    return {
      provider: lesson.videoAsset.provider,
      lessonId,
      playback: access
    };
  }

  async applyMuxWebhook(payload: Record<string, any>, signature?: string) {
    const eventType = String(payload.type || "mux.unknown");
    const assetId = payload?.data?.id || null;
    const uploadId = payload?.data?.upload_id || null;
    const playbackId = Array.isArray(payload?.data?.playback_ids)
      ? payload.data.playback_ids.find((item: any) => item.policy === "signed")?.id ||
        payload.data.playback_ids[0]?.id
      : null;

    if (!assetId && !uploadId) {
      return {
        status: "ignored",
        reason: "mux_identifiers_missing",
        signature
      };
    }

    const asset = await this.prisma.videoAsset.findFirst({
      where: {
        provider: VideoProvider.MUX,
        OR: [
          assetId ? { externalAssetId: assetId } : undefined,
          uploadId ? { externalUploadId: uploadId } : undefined
        ].filter(Boolean) as Prisma.VideoAssetWhereInput[]
      }
    });

    if (!asset) {
      return {
        status: "ignored",
        reason: "video_asset_not_found",
        signature
      };
    }

    if (eventType.includes("asset.ready")) {
      const updated = await this.prisma.videoAsset.update({
        where: { id: asset.id },
        data: {
          externalAssetId: assetId,
          playbackId,
          status: VideoAssetStatus.READY,
          readyAt: new Date(),
          errorMessage: null
        }
      });

      await this.auditService.record({
        actorType: AuditActorType.SYSTEM,
        eventType: AuditEventType.VIDEO_ASSET_READY,
        entityType: "video_asset",
        entityId: asset.id
      });

      return updated;
    }

    if (eventType.includes("asset.errored")) {
      const updated = await this.prisma.videoAsset.update({
        where: { id: asset.id },
        data: {
          status: VideoAssetStatus.ERROR,
          errorMessage: payload?.data?.errors?.messages?.join?.(", ") || "mux_asset_errored"
        }
      });

      await this.auditService.record({
        actorType: AuditActorType.SYSTEM,
        eventType: AuditEventType.VIDEO_ASSET_ERROR,
        entityType: "video_asset",
        entityId: asset.id
      });

      return updated;
    }

    return {
      status: "ignored",
      reason: "event_not_processed"
    };
  }

  async applyCloudflareWebhook(payload: Record<string, any>, signature?: string) {
    const result = payload.result || payload.data || payload;
    const uid = result?.uid || result?.videoUid || null;

    if (!uid) {
      return {
        status: "ignored",
        reason: "cloudflare_uid_missing",
        signature
      };
    }

    const asset = await this.prisma.videoAsset.findFirst({
      where: {
        provider: VideoProvider.CLOUDFLARE_STREAM,
        OR: [{ externalUploadId: uid }, { externalAssetId: uid }]
      }
    });

    if (!asset) {
      return {
        status: "ignored",
        reason: "video_asset_not_found",
        signature
      };
    }

    const readyToStream = Boolean(result.readyToStream || result.ready_to_stream);
    const updated = await this.prisma.videoAsset.update({
      where: { id: asset.id },
      data: {
        externalAssetId: uid,
        status: readyToStream ? VideoAssetStatus.READY : VideoAssetStatus.PROCESSING,
        readyAt: readyToStream ? new Date() : null,
        errorMessage: null
      }
    });

    if (readyToStream) {
      await this.enableCloudflareSignedUrls(uid);
      await this.auditService.record({
        actorType: AuditActorType.SYSTEM,
        eventType: AuditEventType.VIDEO_ASSET_READY,
        entityType: "video_asset",
        entityId: asset.id
      });
    }

    return updated;
  }

  private async requestUploadIntent(provider: VideoProvider, dto: CreateUploadIntentDto): Promise<UploadIntent> {
    if (provider === VideoProvider.MUX) {
      return this.requestMuxUploadIntent();
    }

    return this.requestCloudflareUploadIntent(dto.sizeBytes);
  }

  private async requestMuxUploadIntent(): Promise<UploadIntent> {
    const tokenId = process.env.MUX_TOKEN_ID;
    const tokenSecret = process.env.MUX_TOKEN_SECRET;

    if (!tokenId || !tokenSecret) {
      if (this.allowDevVideoFallback) {
        const devId = `dev_mux_upload_${Date.now()}`;
        return {
          provider: VideoProvider.MUX,
          externalUploadId: devId,
          uploadUrl: `https://dev-upload.invalid/mux/${devId}`
        };
      }

      throw new ServiceUnavailableException("Mux is not configured.");
    }

    const auth = Buffer.from(`${tokenId}:${tokenSecret}`).toString("base64");
    const response = await fetch("https://api.mux.com/video/v1/uploads", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        cors_origin: process.env.PUBLIC_WEB_URL || undefined,
        new_asset_settings: {
          playback_policy: ["signed"]
        }
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(`Mux upload intent failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      data: {
        id: string;
        url: string;
      };
    };

    return {
      provider: VideoProvider.MUX,
      externalUploadId: payload.data.id,
      uploadUrl: payload.data.url
    };
  }

  private async requestCloudflareUploadIntent(sizeBytes?: number): Promise<UploadIntent> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      if (this.allowDevVideoFallback) {
        const devId = `dev_cf_upload_${Date.now()}`;
        return {
          provider: VideoProvider.CLOUDFLARE_STREAM,
          externalUploadId: devId,
          uploadUrl: `https://dev-upload.invalid/cloudflare/${devId}`
        };
      }

      throw new ServiceUnavailableException("Cloudflare Stream is not configured.");
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          maxDurationSeconds: 7200,
          tus: sizeBytes && sizeBytes > 200 * 1024 * 1024 ? true : undefined
        })
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(`Cloudflare upload intent failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      result: {
        uid: string;
        uploadURL: string;
      };
    };

    return {
      provider: VideoProvider.CLOUDFLARE_STREAM,
      externalUploadId: payload.result.uid,
      uploadUrl: payload.result.uploadURL
    };
  }

  private async createMuxPlaybackAccess(playbackId?: string | null, sessionId?: string, userId?: string) {
    if (!playbackId) {
      throw new BadRequestException("Mux playback id is missing.");
    }

    const keyId = process.env.MUX_SIGNING_KEY_ID;
    const privateKeyB64 = process.env.MUX_SIGNING_PRIVATE_KEY_B64;

    if (!keyId || !privateKeyB64) {
      if (this.allowDevVideoFallback) {
        return {
          playbackId,
          token: "dev-mux-playback-token",
          manifestUrl: `https://stream.mux.com/${playbackId}.m3u8?token=dev-mux-playback-token`,
          mode: "development"
        };
      }

      throw new ServiceUnavailableException("Mux playback signing key is not configured.");
    }

    const token = createRs256Jwt(
      {
        alg: "RS256",
        typ: "JWT",
        kid: keyId
      },
      {
        sub: playbackId,
        aud: "v",
        exp: Math.floor(Date.now() / 1000) + this.playbackTokenTtlSeconds,
        kid: keyId,
        custom: {
          session_id: sessionId,
          user_id: userId
        }
      },
      Buffer.from(privateKeyB64, "base64").toString("utf8")
    );

    return {
      playbackId,
      token,
      manifestUrl: `https://stream.mux.com/${playbackId}.m3u8?token=${token}`
    };
  }

  private async createCloudflarePlaybackAccess(videoUid?: string | null) {
    if (!videoUid) {
      throw new BadRequestException("Cloudflare video uid is missing.");
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
    const customerSubdomain = process.env.CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN;

    if (!accountId || !apiToken || !customerSubdomain) {
      if (this.allowDevVideoFallback) {
        return {
          videoUid,
          token: "dev-cloudflare-playback-token",
          manifestUrl: `https://customer-dev.cloudflarestream.com/dev-cloudflare-playback-token/manifest/video.m3u8`,
          mode: "development"
        };
      }

      throw new ServiceUnavailableException("Cloudflare playback access is not configured.");
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          exp: Math.floor(Date.now() / 1000) + this.playbackTokenTtlSeconds
        })
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(`Cloudflare playback token failed: ${response.status}`);
    }

    const payload = (await response.json()) as {
      result: {
        token: string;
      };
    };

    return {
      videoUid,
      token: payload.result.token,
      manifestUrl: `https://${customerSubdomain}.cloudflarestream.com/${payload.result.token}/manifest/video.m3u8`
    };
  }

  private async enableCloudflareSignedUrls(videoUid: string) {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

    if (!accountId || !apiToken) {
      return;
    }

    await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${videoUid}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        uid: videoUid,
        requireSignedURLs: true
      })
    });
  }
}
