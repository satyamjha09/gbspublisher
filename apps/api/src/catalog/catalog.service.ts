import { Injectable, NotFoundException } from "@nestjs/common";
import { BookFormat, OrderStatus, Prisma, ProjectStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";
import { CatalogSearchQueryDto, CatalogSort } from "./dto/catalog-search-query.dto";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedBooks(query?: { genre?: string; language?: string; search?: string }) {
    return this.search({
      genre: query?.genre,
      language: query?.language,
      q: query?.search,
      sort: CatalogSort.NEWEST
    });
  }

  async findPublishedBookBySlug(slug: string) {
    const book = await this.prisma.bookProject.findFirst({
      where: {
        slug,
        status: ProjectStatus.PUBLISHED,
        publishedAt: { not: null },
        editions: { some: { isPublished: true } }
      },
      include: this.publishedBookInclude()
    });

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    const stats = await this.getReviewStats(book.id);

    return this.toCatalogBook({
      ...book,
      reviewStats: stats
    });
  }

  async search(query: CatalogSearchQueryDto = {}) {
    const books = await this.prisma.bookProject.findMany({
      where: this.buildPublishedBookWhere(query),
      orderBy: { publishedAt: "desc" },
      include: this.publishedBookInclude()
    });

    const booksWithStats = await this.attachDiscoveryStats(books);
    const minRating = this.parseNumberFilter(query.minRating);
    const filteredBooks = minRating
      ? booksWithStats.filter((book) => book.reviewStats.averageRating >= minRating)
      : booksWithStats;

    return this.sortBooks(filteredBooks, query.sort ?? CatalogSort.NEWEST).map((book) => this.toCatalogBook(book));
  }

  async findGenres() {
    const genres = await this.prisma.bookProject.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        publishedAt: { not: null },
        genre: { not: null },
        editions: { some: { isPublished: true } }
      },
      distinct: ["genre"],
      orderBy: { genre: "asc" },
      select: { genre: true }
    });

    return genres.map((item) => item.genre).filter(Boolean);
  }

  async findAuthor(authorId: string) {
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: {
        id: true,
        name: true,
        profiles: {
          where: { isPublic: true },
          select: {
            displayName: true,
            penName: true,
            bio: true,
            avatarUrl: true
          },
          take: 1
        },
        projects: {
          where: {
            status: ProjectStatus.PUBLISHED,
            publishedAt: { not: null },
            editions: { some: { isPublished: true } }
          },
          orderBy: { publishedAt: "desc" },
          include: this.publishedBookInclude()
        }
      }
    });

    if (!author) {
      throw new NotFoundException("Author not found");
    }

    const { projects, ...authorProfile } = author;

    return {
      ...authorProfile,
      books: (await this.attachDiscoveryStats(projects)).map((book) => this.toCatalogBook(book))
    };
  }

  private async getReviewStats(projectId: string) {
    const stats = await this.prisma.review.aggregate({
      where: {
        projectId,
        status: ReviewStatus.APPROVED
      },
      _avg: {
        rating: true
      },
      _count: {
        id: true
      }
    });

    return {
      averageRating: stats._avg.rating ?? 0,
      reviewCount: stats._count.id
    };
  }

  private buildPublishedBookWhere(query: CatalogSearchQueryDto): Prisma.BookProjectWhereInput {
    const search = query.q?.trim();
    const format = this.normalizeFormat(query.format);
    const maxPrice = this.parseNumberFilter(query.maxPrice);

    return {
      status: ProjectStatus.PUBLISHED,
      publishedAt: { not: null },
      genre: query.genre,
      language: query.language,
      editions: {
        some: {
          isPublished: true,
          ...(format ? { format } : {}),
          ...(maxPrice ? { price: { lte: maxPrice } } : {})
        }
      },
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { subtitle: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { genre: { contains: search, mode: "insensitive" } },
              { keywords: { hasSome: this.searchTerms(search) } },
              { tags: { hasSome: this.searchTerms(search) } },
              {
                owner: {
                  profiles: {
                    some: {
                      isPublic: true,
                      OR: [
                        { displayName: { contains: search, mode: "insensitive" } },
                        { penName: { contains: search, mode: "insensitive" } }
                      ]
                    }
                  }
                }
              }
            ]
          }
        : {})
    };
  }

  private publishedBookInclude() {
    return {
      owner: {
        select: {
          id: true,
          name: true,
          profiles: {
            where: { isPublic: true },
            select: {
              displayName: true,
              penName: true,
              bio: true,
              avatarUrl: true
            },
            take: 1
          }
        }
      },
      editions: {
        where: { isPublished: true }
      }
    };
  }

  private async attachDiscoveryStats<T extends { id: string }>(books: T[]) {
    if (books.length === 0) {
      return [];
    }

    const projectIds = books.map((book) => book.id);
    const [reviewStats, trendingScores] = await Promise.all([
      this.getReviewStatsByProject(projectIds),
      this.getTrendingScoresByProject(projectIds)
    ]);

    return books.map((book) => ({
      ...book,
      reviewStats: reviewStats.get(book.id) ?? { averageRating: 0, reviewCount: 0 },
      discoveryStats: {
        trendingScore: trendingScores.get(book.id) ?? 0
      }
    }));
  }

  private async getReviewStatsByProject(projectIds: string[]) {
    const groupedStats = await this.prisma.review.groupBy({
      by: ["projectId"],
      where: {
        projectId: { in: projectIds },
        status: ReviewStatus.APPROVED
      },
      _avg: { rating: true },
      _count: { id: true }
    });

    return new Map(
      groupedStats.map((item) => [
        item.projectId,
        {
          averageRating: item._avg.rating ?? 0,
          reviewCount: item._count.id
        }
      ])
    );
  }

  private async getTrendingScoresByProject(projectIds: string[]) {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [libraryItems, reviews, orderItems] = await Promise.all([
      this.prisma.readerLibraryItem.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: since }
        },
        _count: { id: true }
      }),
      this.prisma.review.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: since },
          status: ReviewStatus.APPROVED
        },
        _count: { id: true }
      }),
      this.prisma.orderItem.groupBy({
        by: ["projectId"],
        where: {
          projectId: { in: projectIds },
          createdAt: { gte: since },
          order: { status: OrderStatus.PAID }
        },
        _sum: { quantity: true }
      })
    ]);

    const scores = new Map<string, number>();
    const addScore = (projectId: string, score: number) => {
      scores.set(projectId, (scores.get(projectId) ?? 0) + score);
    };

    libraryItems.forEach((item) => addScore(item.projectId, item._count.id * 3));
    reviews.forEach((item) => addScore(item.projectId, item._count.id * 2));
    orderItems.forEach((item) => addScore(item.projectId, (item._sum.quantity ?? 0) * 5));

    return scores;
  }

  private sortBooks<
    T extends {
      publishedAt: Date | null;
      reviewStats: { averageRating: number; reviewCount: number };
      discoveryStats: { trendingScore: number };
      editions: { price: Prisma.Decimal | null }[];
    }
  >(books: T[], sort: CatalogSort) {
    return [...books].sort((a, b) => {
      if (sort === CatalogSort.TOP_RATED) {
        return b.reviewStats.averageRating - a.reviewStats.averageRating || b.reviewStats.reviewCount - a.reviewStats.reviewCount;
      }

      if (sort === CatalogSort.TRENDING) {
        return b.discoveryStats.trendingScore - a.discoveryStats.trendingScore || this.compareNewest(a, b);
      }

      if (sort === CatalogSort.PRICE_LOW) {
        return this.lowestPrice(a) - this.lowestPrice(b);
      }

      if (sort === CatalogSort.PRICE_HIGH) {
        return this.highestPrice(b) - this.highestPrice(a);
      }

      return this.compareNewest(a, b);
    });
  }

  private toCatalogBook(book: {
    id: string;
    title: string;
    slug: string | null;
    subtitle: string | null;
    description: string | null;
    language: string;
    genre: string | null;
    tags: string[];
    keywords: string[];
    publishedAt: Date | null;
    owner: {
      id: string;
      name: string | null;
      profiles: {
        displayName: string;
        penName: string | null;
        bio?: string | null;
        avatarUrl?: string | null;
      }[];
    };
    editions: {
      id: string;
      format: BookFormat;
      price: Prisma.Decimal | null;
      currency: string;
    }[];
    reviewStats: { averageRating: number; reviewCount: number };
  }) {
    const publicProfile = book.owner.profiles[0];

    return {
      id: book.id,
      title: book.title,
      slug: book.slug,
      subtitle: book.subtitle,
      description: book.description,
      language: book.language,
      genre: book.genre,
      tags: book.tags,
      keywords: book.keywords,
      publishedAt: book.publishedAt,
      author: {
        id: book.owner.id,
        displayName: publicProfile?.displayName ?? book.owner.name,
        penName: publicProfile?.penName ?? null,
        bio: publicProfile?.bio ?? null,
        avatarUrl: publicProfile?.avatarUrl ?? null
      },
      editions: book.editions.map((edition) => ({
        id: edition.id,
        format: edition.format,
        price: edition.price?.toString() ?? null,
        currency: edition.currency
      })),
      reviewStats: book.reviewStats
    };
  }

  private compareNewest(a: { publishedAt: Date | null }, b: { publishedAt: Date | null }) {
    return (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0);
  }

  private lowestPrice(book: { editions: { price: Prisma.Decimal | null }[] }) {
    const prices = book.editions.map((edition) => this.decimalToNumber(edition.price)).filter((price) => price !== null);
    return prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
  }

  private highestPrice(book: { editions: { price: Prisma.Decimal | null }[] }) {
    const prices = book.editions.map((edition) => this.decimalToNumber(edition.price)).filter((price) => price !== null);
    return prices.length > 0 ? Math.max(...prices) : Number.NEGATIVE_INFINITY;
  }

  private decimalToNumber(value: Prisma.Decimal | null) {
    return value === null ? null : Number(value.toString());
  }

  private parseNumberFilter(value?: string) {
    if (!value) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private normalizeFormat(format?: string) {
    const normalizedFormat = format?.toUpperCase();
    return Object.values(BookFormat).find((value) => value === normalizedFormat);
  }

  private searchTerms(search: string) {
    return Array.from(new Set([search, ...search.split(/\s+/).filter(Boolean)]));
  }
}
