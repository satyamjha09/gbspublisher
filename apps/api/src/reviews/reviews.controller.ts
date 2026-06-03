import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateReviewDto, UpdateReviewDto } from "./reviews.dto";
import { ReviewsService } from "./reviews.service";

@ApiTags("Reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get("books/:projectId")
  findPublicReviewsForBook(@Param("projectId") projectId: string) {
    return this.reviewsService.findPublicReviewsForBook(projectId);
  }

  @Get("books/:projectId/stats")
  getBookReviewStats(@Param("projectId") projectId: string) {
    return this.reviewsService.getBookReviewStats(projectId);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post("books/:projectId")
  createReview(@CurrentUser() user: RequestUser, @Param("projectId") projectId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(user.id, projectId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(":reviewId")
  updateOwnReview(@CurrentUser() user: RequestUser, @Param("reviewId") reviewId: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.updateOwnReview(user.id, reviewId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete(":reviewId")
  deleteOwnReview(@CurrentUser() user: RequestUser, @Param("reviewId") reviewId: string) {
    return this.reviewsService.deleteOwnReview(user.id, reviewId);
  }
}
