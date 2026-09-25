import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { PlotsModule } from './plots/plots.module';
import { ReservationsModule } from './reservations/reservations.module';
import { BookingsModule } from './bookings/bookings.module';
import { StorageModule } from './storage/storage.module';
import { PiiModule } from './pii/pii.module';
import { AuditModule } from './audit/audit.module';
import { FinanceModule } from './finance/finance.module';
import { DocumentsModule } from './documents/documents.module';
import { PaymentsModule } from './payments/payments.module';
import { VisitsModule } from './visits/visits.module';
import { LeadsModule } from './leads/leads.module';
import { CustomersModule } from './customers/customers.module';
import { LayoutsModule } from './layouts/layouts.module';
import { ProjectsModule } from './projects/projects.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpsModule } from './ops/ops.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { BigIntJsonInterceptor } from './common/serialize/bigint-json.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL_MS || 60_000),
      limit: Number(process.env.THROTTLE_LIMIT || 60),
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    RbacModule,
    PlotsModule,
    ReservationsModule,
    BookingsModule,
    StorageModule,
    PiiModule,
    AuditModule,
    FinanceModule,
    DocumentsModule,
    PaymentsModule,
    VisitsModule,
    LeadsModule,
    CustomersModule,
    LayoutsModule,
    ProjectsModule,
    NotificationsModule,
    OpsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: BigIntJsonInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
