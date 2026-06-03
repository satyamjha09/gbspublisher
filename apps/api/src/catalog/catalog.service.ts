import { Injectable, NotFoundException } from "@nestjs/common";
import { ProjectStatus, ReviewStatus } from "@prisma/client";
import { PrismaService } from "@gbs/database";

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublishedBooks(query?: { genre?: string; language?: string; search?: string }) {
    const books = await this.prisma.bookProject.findMany({
      where: {
        status: ProjectStatus.PUBLISHED,
        publishedAt: { not: null },
        genre: query?.genre,
        language: query?.language,
        ...(query?.search
          ? {
              OR: [
                { title: { contains: query.search, mode: "insensitive" } },
                { subtitle: { contains: query.search, mode: "insensitive" } },
                { description: { contains: query.search, mode: "insensitive" } },
                { keywords: { has: query.search } },
                { tags: { has: query.search } }
              ]
            }
          : {})
      },
      orderBy: { publishedAt: "desc" },
      include: {
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
      }
    });

    return this.attachReviewStats(books);
  }

  async findPublishedBookBySlug(slug: string) {
    const book = await this.prisma.bookProject.findFirst({
      where: {
        slug,
        status: ProjectStatus.PUBLISHED,
        publishedAt: { not: null }
      },
      include: {
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
      }
    });

    if (!book) {
      throw new NotFoundException("Book not found");
    }

    const stats = await this.getReviewStats(book.id);

    return {
      ...book,
      reviewStats: stats
    };
  }

  private async attachReviewStats<T extends { id: string }>(books: T[]) {
    return Promise.all(
      books.map(async (book) => ({
        ...book,
        reviewStats: await this.getReviewStats(book.id)
      }))
    );
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
}
