import { clerkClient } from "@clerk/express";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { PrismaService } from "@gbs/database";
import { createSlug } from "@gbs/common";
import { UpsertUserDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByClerkId(clerkId: string) {
    return this.prisma.user.findUnique({
      where: { clerkId }
    });
  }

  upsertFromClerk(dto: UpsertUserDto) {
    const displayName = dto.name ?? dto.email.split("@")[0] ?? "New Reader";

    return this.prisma.user.upsert({
      where: { clerkId: dto.clerkId },
      create: {
        clerkId: dto.clerkId,
        email: dto.email,
        name: dto.name,
        profiles: {
          create: {
            displayName,
            slug: `${createSlug(displayName)}-${Date.now()}`
          }
        }
      },
      update: {
        email: dto.email,
        name: dto.name
      }
    });
  }

  async syncFromClerk(clerkId: string) {
    const existingUser = await this.findByClerkId(clerkId);

    if (existingUser) {
      return existingUser;
    }

    const clerkUser = await clerkClient.users.getUser(clerkId);
    const primaryEmail = clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId);

    if (!primaryEmail?.emailAddress) {
      throw new UnauthorizedException("Clerk user does not have an email");
    }

    const fullName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
    const displayName = fullName || clerkUser.username || "New Reader";

    return this.prisma.user.create({
      data: {
        clerkId,
        email: primaryEmail.emailAddress,
        name: fullName || clerkUser.username || null,
        roles: [UserRole.READER],
        profiles: {
          create: {
            displayName,
            slug: `${createSlug(displayName)}-${Date.now()}`
          }
        }
      }
    });
  }

  async addRole(userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    if (user.roles.includes(role)) {
      return user;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        roles: [...user.roles, role]
      }
    });
  }
}
