import { Module } from "@nestjs/common";
import { ApiAuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { EditionsController } from "./editions.controller";
import { EditionsService } from "./editions.service";

@Module({
  imports: [ApiAuthModule, UsersModule],
  controllers: [EditionsController],
  providers: [EditionsService]
})
export class EditionsModule {}
