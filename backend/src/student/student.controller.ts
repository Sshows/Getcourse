import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { UpdateLessonProgressDto } from "./dto/update-lesson-progress.dto";
import { StudentService } from "./student.service";

@Controller("student")
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get("courses")
  listCourses(@Headers("x-user-id") userId: string, @Headers("x-session-id") sessionId: string) {
    return this.studentService.listCourses(userId, sessionId);
  }

  @Get("lessons/:lessonId")
  getLesson(
    @Param("lessonId") lessonId: string,
    @Headers("x-user-id") userId: string,
    @Headers("x-session-id") sessionId: string
  ) {
    return this.studentService.getLesson(userId, sessionId, lessonId);
  }

  @Post("lessons/:lessonId/playback-access")
  getPlaybackAccess(
    @Param("lessonId") lessonId: string,
    @Headers("x-user-id") userId: string,
    @Headers("x-session-id") sessionId: string
  ) {
    return this.studentService.getPlaybackAccess(userId, sessionId, lessonId);
  }

  @Post("lessons/:lessonId/progress")
  updateProgress(
    @Param("lessonId") lessonId: string,
    @Headers("x-user-id") userId: string,
    @Headers("x-session-id") sessionId: string,
    @Body() dto: UpdateLessonProgressDto
  ) {
    return this.studentService.updateLessonProgress(userId, sessionId, lessonId, dto);
  }
}
