import { Module } from "@nestjs/common";
import { ApiAuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  imports: [ApiAuthModule, UsersModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
