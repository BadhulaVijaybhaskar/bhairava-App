import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RbacModule } from '../rbac/rbac.module';
import { PiiModule } from '../pii/pii.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, RbacModule, PiiModule, AuditModule],
  controllers: [CustomersController],
  providers: [CustomersService],
  exports: [CustomersService],
})
export class CustomersModule {}