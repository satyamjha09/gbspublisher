import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CompleteUploadDto, CreateUploadDto } from "./files.dto";
import { FilesService } from "./files.service";

@ApiTags("Files")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.AUTHOR, UserRole.PUBLISHER_ADMIN, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("files")
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("uploads")
  createUpload(@CurrentUser() user: RequestUser, @Body() dto: CreateUploadDto) {
    return this.filesService.createUpload(user.id, dto);
  }

  @Post(":id/complete")
  completeUpload(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: CompleteUploadDto) {
    return this.filesService.completeUpload(user.id, id, dto);
  }

  @Get("project/:projectId")
  listProjectFiles(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.filesService.listProjectFiles(user.id, projectId);
  }
}
