import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    if (redisUrl.startsWith("mock://")) {
      // Dev fallback for environments where a real Redis server is not available yet.
      // Compose/runtime still uses a real Redis instance.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const RedisMock = require("ioredis-mock");
      this.client = new RedisMock();
      return;
    }

    this.client = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 2
    });
  }

  get raw() {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds?: number) {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, "EX", ttlSeconds);
      return;
    }

    await this.client.set(key, payload);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
