import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AdminSessionGuard } from "../admin-auth/admin-session.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserStatusDto } from "./dto/update-user-status.dto";
import { UsersService } from "./users.service";

@Controller("admin/users")
@UseGuards(AdminSessionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  listUsers() {
    return this.usersService.listUsers();
  }

  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Patch(":userId/status")
  updateStatus(@Param("userId") userId: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(userId, dto);
  }
}
