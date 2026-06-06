import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CatalogSearchQueryDto, CatalogSort } from "./dto/catalog-search-query.dto";
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

  @Get("search")
  search(@Query() query: CatalogSearchQueryDto) {
    return this.catalogService.search(query);
  }

  @Get("new-releases")
  findNewReleases(@Query() query: CatalogSearchQueryDto) {
    return this.catalogService.search({ ...query, sort: CatalogSort.NEWEST });
  }

  @Get("top-rated")
  findTopRated(@Query() query: CatalogSearchQueryDto) {
    return this.catalogService.search({ ...query, sort: CatalogSort.TOP_RATED });
  }

  @Get("trending")
  findTrending(@Query() query: CatalogSearchQueryDto) {
    return this.catalogService.search({ ...query, sort: CatalogSort.TRENDING });
  }

  @Get("genres")
  findGenres() {
    return this.catalogService.findGenres();
  }

  @Get("authors/:authorId")
  findAuthor(@Param("authorId") authorId: string) {
    return this.catalogService.findAuthor(authorId);
  }

  @Get("books/:slug")
  findPublishedBookBySlug(@Param("slug") slug: string) {
    return this.catalogService.findPublishedBookBySlug(slug);
  }
}
