import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export type RequestUser = {
  id: string;
  clerkId: string;
  email: string;
  name: string | null;
  roles: string[];
};

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser | undefined => {
  const request = ctx.switchToHttp().getRequest<{ user?: RequestUser }>();
  return request.user;
});
