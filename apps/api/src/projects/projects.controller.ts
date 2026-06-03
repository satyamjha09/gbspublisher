import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { ProjectsService } from "./projects.service";
import { CreateProjectDto, RegisterFileAssetDto, UpdateProjectDto } from "./projects.dto";

@ApiTags("Projects")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.AUTHOR, UserRole.PUBLISHER_ADMIN, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.projectsService.listForOwner(user.id);
  }

  @Get(":id")
  getById(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.getByIdForOwner(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(user.id, id, dto);
  }

  @Post(":id/submit-for-review")
  submitForReview(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.submitForReview(user.id, id);
  }

  @Delete(":id")
  remove(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.projectsService.remove(user.id, id);
  }

  @Post(":id/files")
  registerFile(@CurrentUser() user: RequestUser, @Param("id") id: string, @Body() dto: RegisterFileAssetDto) {
    return this.projectsService.registerFile(user.id, id, dto);
  }
}
