import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccessModule } from "./access/access.module";
import { AdminAuthModule } from "./admin-auth/admin-auth.module";
import { AuditModule } from "./audit/audit.module";
import { CoursesModule } from "./courses/courses.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { HealthModule } from "./health/health.module";
import { LeadsModule } from "./leads/leads.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { SessionsModule } from "./sessions/sessions.module";
import { StudentModule } from "./student/student.module";
import { UsersModule } from "./users/users.module";
import { VideosModule } from "./videos/videos.module";
import { WebhooksModule } from "./webhooks/webhooks.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    RedisModule,
    HealthModule,
    AdminAuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    AccessModule,
    SessionsModule,
    VideosModule,
    AuditModule,
    WebhooksModule,
    LeadsModule,
    StudentModule
  ]
})
export class AppModule {}
