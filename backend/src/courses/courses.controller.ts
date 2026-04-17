import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CreateCourseDto } from "./dto/create-course.dto";
import { CreateLessonMaterialDto } from "./dto/create-lesson-material.dto";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { CoursesService } from "./courses.service";

@Controller("admin")
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get("courses")
  listCourses() {
    return this.coursesService.listCourses();
  }

  @Post("courses")
  createCourse(@Body() dto: CreateCourseDto) {
    return this.coursesService.createCourse(dto);
  }

  @Get("courses/:courseId")
  getCourse(@Param("courseId") courseId: string) {
    return this.coursesService.getCourse(courseId);
  }

  @Post("courses/:courseId/lessons")
  createLesson(@Param("courseId") courseId: string, @Body() dto: CreateLessonDto) {
    return this.coursesService.createLesson(courseId, dto);
  }

  @Post("lessons/:lessonId/materials")
  createLessonMaterial(@Param("lessonId") lessonId: string, @Body() dto: CreateLessonMaterialDto) {
    return this.coursesService.createLessonMaterial(lessonId, dto);
  }
}
