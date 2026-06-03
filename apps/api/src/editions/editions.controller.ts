import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateEditionDto, UpdateEditionDto } from "./editions.dto";
import { EditionsService } from "./editions.service";

@ApiTags("Editions")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.AUTHOR, UserRole.PUBLISHER_ADMIN, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("projects/:projectId/editions")
export class EditionsController {
  constructor(private readonly editionsService: EditionsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() dto: CreateEditionDto) {
    return this.editionsService.create(user.id, projectId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string) {
    return this.editionsService.findAll(user.id, projectId);
  }

  @Get(":editionId")
  findOne(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("editionId") editionId: string) {
    return this.editionsService.findOne(user.id, projectId, editionId);
  }

  @Patch(":editionId")
  update(
    @CurrentUser() user: RequestUser,
    @Param("projectId") projectId: string,
    @Param("editionId") editionId: string,
    @Body() dto: UpdateEditionDto
  ) {
    return this.editionsService.update(user.id, projectId, editionId, dto);
  }

  @Delete(":editionId")
  remove(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Param("editionId") editionId: string) {
    return this.editionsService.remove(user.id, projectId, editionId);
  }
}
