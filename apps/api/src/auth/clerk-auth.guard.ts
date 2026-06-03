import { getAuth } from "@clerk/express";
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { UsersService } from "../users/users.service";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = getAuth(request);

    if (!auth.isAuthenticated || !auth.userId) {
      throw new UnauthorizedException("You must be signed in");
    }

    const user = await this.usersService.syncFromClerk(auth.userId);

    (request as Request & { user?: unknown }).user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      roles: user.roles
    };

    return true;
  }
}
