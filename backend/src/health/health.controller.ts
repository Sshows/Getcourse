import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  @Get()
  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    const redisPong = await this.redis.raw.ping();

    return {
      status: "ok",
      service: "securecourse-backend",
      timestamp: new Date().toISOString(),
      checks: {
        postgres: "ok",
        redis: redisPong
      }
    };
  }
}
