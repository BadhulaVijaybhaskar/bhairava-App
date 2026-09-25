import { Module } from '@nestjs/common';
import { PlotsController } from './plots.controller';
import { PlotsService } from './plots.service';
import { RbacModule } from '../rbac/rbac.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [RbacModule, AuditModule],
  controllers: [PlotsController],
  providers: [PlotsService],
  exports: [PlotsService],
})
export class PlotsModule {}
