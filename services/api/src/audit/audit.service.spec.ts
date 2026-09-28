import { ForbiddenException } from '@nestjs/common';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const prisma = {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  const service = new AuditService(prisma as any);

  beforeEach(() => jest.clearAllMocks());

  it('redacts password/token/pan/aadhaar from meta', () => {
    const meta = service.sanitizeMeta({
      password: 'secret',
      refreshToken: 'abc',
      pan: 'ABCDE1234F',
      aadhaar: '123456789012',
      ok: 'keep',
    }) as any;
    expect(meta.password).toBe('[REDACTED]');
    expect(meta.refreshToken).toBe('[REDACTED]');
    expect(meta.pan).toBe('[REDACTED]');
    expect(meta.aadhaar).toBe('[REDACTED]');
    expect(meta.ok).toBe('keep');
  });

  it('skips write when organizationId missing', async () => {
    await service.log({ action: 'x', entityType: 'Y' });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('writes sanitized audit row', async () => {
    prisma.auditLog.create.mockResolvedValue({});
    await service.log({
      organizationId: 'org1',
      actorId: 'u1',
      action: 'payment.void',
      entityType: 'Payment',
      entityId: 'p1',
      metaJson: { password: 'nope', reason: 'dup' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org1',
        action: 'payment.void',
        metaJson: expect.objectContaining({ password: '[REDACTED]', reason: 'dup' }),
      }),
    });
  });

  it('rejectMutation throws ForbiddenException', () => {
    expect(() => service.rejectMutation()).toThrow(ForbiddenException);
  });
});
