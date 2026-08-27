import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessor } from '../../src/payments/payment.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentEntity, PaymentStatus } from '../../src/payments/payment.entity';
import { StripeAdapter } from '../../src/payments/gateways/stripe.adapter';
import { PaymentsService } from '../../src/payments/payments.service';
import { RedisService } from '../../src/common/cache/redis.service';
import { DataSource } from 'typeorm';

describe('PaymentProcessor (Resilience & Idempotency)', () => {
  let processor: PaymentProcessor;
  let mockStripeAdapter: any;
  let mockRedisService: any;
  let mockPaymentRepository: any;
  let mockDataSource: any;

  beforeEach(async () => {
    mockStripeAdapter = { charge: jest.fn() };
    mockRedisService = { get: jest.fn(), set: jest.fn() };
    mockPaymentRepository = { findOne: jest.fn(), save: jest.fn() };
    mockDataSource = { transaction: jest.fn(async (cb) => await cb(mockPaymentRepository)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentProcessor,
        { provide: getRepositoryToken(PaymentEntity), useValue: mockPaymentRepository },
        { provide: StripeAdapter, useValue: mockStripeAdapter },
        { provide: PaymentsService, useValue: { canRetry: jest.fn().mockReturnValue(true) } },
        { provide: DataSource, useValue: mockDataSource },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    processor = module.get<PaymentProcessor>(PaymentProcessor);
  });

  it('should prevent processing if payment is already in Redis (Idempotency)', async () => {
    mockRedisService.get.mockResolvedValue('true');
    
    await processor.process({ data: { paymentId: '123' }, attemptsMade: 0 } as any);
    
    expect(mockStripeAdapter.charge).not.toHaveBeenCalled();
  });

  it('should NOT retry on non-retryable errors (e.g. invalid CVV)', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockPaymentRepository.findOne.mockResolvedValue({ id: '123', status: PaymentStatus.PENDING });
    
    // Configurar o mockService para retornar false para erro de CVV
    // O PaymentProcessor chama o paymentsService.canRetry
    // Precisamos ajustar o mock do serviço
    // ...
  });
});
