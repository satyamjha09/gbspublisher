import { Module } from "@nestjs/common";
import { ApiAuthModule } from "../auth/auth.module";
import { FilesModule } from "../files/files.module";
import { UsersModule } from "../users/users.module";
import { ReaderController } from "./reader.controller";
import { ReaderService } from "./reader.service";

@Module({
  imports: [ApiAuthModule, FilesModule, UsersModule],
  controllers: [ReaderController],
  providers: [ReaderService]
})
export class ReaderModule {}
