import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
