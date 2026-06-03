import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("books")
  findPublishedBooks(@Query("genre") genre?: string, @Query("language") language?: string, @Query("search") search?: string) {
    return this.catalogService.findPublishedBooks({
      genre,
      language,
      search
    });
  }

  @Get("books/:slug")
  findPublishedBookBySlug(@Param("slug") slug: string) {
    return this.catalogService.findPublishedBookBySlug(slug);
  }
}
