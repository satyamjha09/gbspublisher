import { Module } from "@nestjs/common";
import { ApiAuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [ApiAuthModule, UsersModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService]
})
export class ReviewsModule {}
