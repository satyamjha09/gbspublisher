import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles, RolesGuard, type RequestUser } from "@gbs/auth";
import { ClerkAuthGuard } from "../auth/clerk-auth.guard";
import { CreateCheckoutDto } from "./orders.dto";
import { OrdersService } from "./orders.service";

@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, RolesGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post("dev-checkout")
  devCheckout(@CurrentUser() user: RequestUser, @Body() dto: CreateCheckoutDto) {
    return this.ordersService.devCheckout(user.id, dto);
  }

  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("me")
  findMyOrders(@CurrentUser() user: RequestUser) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Roles(UserRole.READER, UserRole.AUTHOR, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("library/me")
  findMyLibrary(@CurrentUser() user: RequestUser) {
    return this.ordersService.findMyLibrary(user.id);
  }

  @Roles(UserRole.AUTHOR, UserRole.PUBLISHER_ADMIN, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get("royalties/me")
  findMyRoyaltyLedger(@CurrentUser() user: RequestUser) {
    return this.ordersService.findCreatorRoyaltyLedger(user.id);
  }
}
