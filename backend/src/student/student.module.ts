import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { SessionsModule } from "../sessions/sessions.module";
import { VideosModule } from "../videos/videos.module";
import { StudentController } from "./student.controller";
import { StudentService } from "./student.service";

@Module({
  imports: [AuditModule, SessionsModule, VideosModule],
  controllers: [StudentController],
  providers: [StudentService]
})
export class StudentModule {}
