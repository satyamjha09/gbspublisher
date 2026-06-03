import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "@gbs/database";
import { AuthModule } from "@gbs/auth";
import { StorageModule } from "@gbs/storage";
import { QueueModule } from "@gbs/queue";
import { HealthModule } from "./health/health.module";
import { UsersModule } from "./users/users.module";
import { ProjectsModule } from "./projects/projects.module";
import { CatalogModule } from "./catalog/catalog.module";
import { ApiAuthModule } from "./auth/auth.module";
import { FilesModule } from "./files/files.module";
import { EditionsModule } from "./editions/editions.module";
import { AdminModule } from "./admin/admin.module";
import { OrdersModule } from "./orders/orders.module";
import { ReaderModule } from "./reader/reader.module";
import { ReviewsModule } from "./reviews/reviews.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ApiAuthModule,
    StorageModule,
    QueueModule,
    HealthModule,
    UsersModule,
    ProjectsModule,
    EditionsModule,
    FilesModule,
    AdminModule,
    OrdersModule,
    ReaderModule,
    ReviewsModule,
    CatalogModule
  ]
})
export class AppModule {}
