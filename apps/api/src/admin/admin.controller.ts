import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { ReviewsService } from "../reviews/reviews.service";
import { ModerateReviewDto } from "../reviews/reviews.dto";
import { AdminService } from "./admin.service";
import { RejectProjectDto } from "./admin.dto";

@ApiTags("Admin")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly reviewsService: ReviewsService
  ) {}

  @Get("reviews/pending")
  findPendingReviews() {
    return this.reviewsService.findPendingReviewsForAdmin();
  }

  @Post("reviews/:reviewId/moderate")
  moderateReview(@CurrentUser() user: RequestUser, @Param("reviewId") reviewId: string, @Body() dto: ModerateReviewDto) {
    return this.reviewsService.moderateReview(user.id, reviewId, dto.status, dto.note);
  }

  @Get("projects/review-queue")
  findReviewQueue() {
    return this.adminService.findReviewQueue();
  }

  @Get("projects/:id")
  findProject(@Param("id") projectId: string) {
    return this.adminService.findProjectForAdmin(projectId);
  }

  @Post("projects/:id/approve")
  approveProject(@CurrentUser() user: RequestUser, @Param("id") projectId: string) {
    return this.adminService.approveProject(user.id, projectId);
  }

  @Post("projects/:id/reject")
  rejectProject(@CurrentUser() user: RequestUser, @Param("id") projectId: string, @Body() dto: RejectProjectDto) {
    return this.adminService.rejectProject(user.id, projectId, dto.reason);
  }

  @Post("projects/:id/publish")
  publishProject(@CurrentUser() user: RequestUser, @Param("id") projectId: string) {
    return this.adminService.publishProject(user.id, projectId);
  }
}
