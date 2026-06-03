import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { ClerkAuthGuard } from "./clerk-auth.guard";

@Module({
  imports: [UsersModule],
  providers: [ClerkAuthGuard],
  exports: [ClerkAuthGuard]
})
export class ApiAuthModule {}
