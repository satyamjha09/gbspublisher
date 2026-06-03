import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateBookmarkDto, CreateHighlightDto, UpdateProgressDto } from "./reader.dto";
import { ReaderService } from "./reader.service";

@ApiTags("Reader")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller("reader")
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Get("editions/:editionId/open")
  openEdition(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string) {
    return this.readerService.openEdition(user.id, editionId);
  }

  @Get("editions/:editionId/progress")
  getProgress(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string) {
    return this.readerService.getProgress(user.id, editionId);
  }

  @Patch("editions/:editionId/progress")
  updateProgress(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string, @Body() dto: UpdateProgressDto) {
    return this.readerService.updateProgress(user.id, editionId, dto);
  }

  @Get("editions/:editionId/bookmarks")
  listBookmarks(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string) {
    return this.readerService.listBookmarks(user.id, editionId);
  }

  @Post("editions/:editionId/bookmarks")
  createBookmark(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string, @Body() dto: CreateBookmarkDto) {
    return this.readerService.createBookmark(user.id, editionId, dto);
  }

  @Delete("bookmarks/:bookmarkId")
  deleteBookmark(@CurrentUser() user: RequestUser, @Param("bookmarkId") bookmarkId: string) {
    return this.readerService.deleteBookmark(user.id, bookmarkId);
  }

  @Get("editions/:editionId/highlights")
  listHighlights(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string) {
    return this.readerService.listHighlights(user.id, editionId);
  }

  @Post("editions/:editionId/highlights")
  createHighlight(@CurrentUser() user: RequestUser, @Param("editionId") editionId: string, @Body() dto: CreateHighlightDto) {
    return this.readerService.createHighlight(user.id, editionId, dto);
  }

  @Delete("highlights/:highlightId")
  deleteHighlight(@CurrentUser() user: RequestUser, @Param("highlightId") highlightId: string) {
    return this.readerService.deleteHighlight(user.id, highlightId);
  }
}
