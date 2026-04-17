import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { RevokeEnrollmentDto } from "./dto/revoke-enrollment.dto";
import { EnrollmentsService } from "./enrollments.service";

@Controller("admin/enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Get()
  listEnrollments() {
    return this.enrollmentsService.listEnrollments();
  }

  @Post()
  createEnrollment(@Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.createEnrollment(dto);
  }

  @Patch(":enrollmentId/revoke")
  revokeEnrollment(@Param("enrollmentId") enrollmentId: string, @Body() dto: RevokeEnrollmentDto) {
    return this.enrollmentsService.revokeEnrollment(enrollmentId, dto.reason);
  }
}
