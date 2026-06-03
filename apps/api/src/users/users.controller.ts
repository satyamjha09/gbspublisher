import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { UsersService } from "./users.service";
import { UpsertUserDto } from "./users.dto";

@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post("sync")
  syncUser(@Body() dto: UpsertUserDto) {
    return this.usersService.upsertFromClerk(dto);
  }

  @UseGuards(ClerkAuthGuard)
  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @UseGuards(ClerkAuthGuard)
  @Post("become-author")
  becomeAuthor(@CurrentUser() user: RequestUser) {
    return this.usersService.addRole(user.id, UserRole.AUTHOR);
  }
}
