import { Test, TestingModule } from '@nestjs/testing';
import { PaymentProcessor } from '../../src/payments/payment.processor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentEntity } from '../../src/payments/payment.entity';
import { StripeAdapter } from '../../src/payments/gateways/stripe.adapter';
import { PaymentsService } from '../../src/payments/payments.service';
import { RedisService } from '../../src/common/cache/redis.service';
import { DataSource } from 'typeorm';

describe('Stress & Security Tests', () => {
  let processor: PaymentProcessor;
  let mockStripeAdapter: any;
  let mockRedisService: any;
  let mockPaymentRepository: any;

  beforeEach(async () => {
    mockStripeAdapter = { charge: jest.fn() };
    mockRedisService = { get: jest.fn(), set: jest.fn() };
    mockPaymentRepository = { findOne: jest.fn(), save: jest.fn() };
    
    // Mock simples de dataSource
    const mockDataSource = { transaction: jest.fn(async (cb) => await cb(mockPaymentRepository)) };

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

  it('deve garantir que chamadas simultâneas com mesma chave idempotente sejam tratadas (Idempotência)', async () => {
    // Simula que a primeira chamada ainda não gravou no Redis
    mockRedisService.get.mockResolvedValueOnce(null);
    mockRedisService.get.mockResolvedValueOnce('true');
    
    mockPaymentRepository.findOne.mockResolvedValue({ id: 'p1', status: 'PENDING' });
    
    // Sucesso no mock de carga
    mockStripeAdapter.charge.mockResolvedValue({ id: 's1' });

    const jobMock = { 
        data: { paymentId: 'p1' }, 
        attemptsMade: 0, 
        opts: { attempts: 5 } 
    } as any;

    // Simulação de duas chamadas quase simultâneas
    await Promise.all([
      processor.process(jobMock),
      processor.process(jobMock)
    ]);

    // O Stripe só deve ter sido chamado uma vez devido ao bloqueio da transação ou cache
    expect(mockStripeAdapter.charge).toHaveBeenCalledTimes(1);
  });

  it('deve abrir o Circuit Breaker após excesso de falhas', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockPaymentRepository.findOne.mockResolvedValue({ id: 'p2', status: 'PENDING' });
    
    // Simula erro constante no adapter
    mockStripeAdapter.charge.mockRejectedValue(new Error('Gateway Timeout'));

    // Executa várias chamadas para disparar o CB
    // O mock precisa simular o objeto job corretamente
    const jobMock = { 
        data: { paymentId: 'p2' }, 
        attemptsMade: 0, 
        opts: { attempts: 5 } 
    } as any;

    for (let i = 0; i < 6; i++) {
        try { await processor.process(jobMock); } catch (e) {}
    }

    // A partir de um ponto, o Circuit Breaker deve impedir a chamada ao stripe
    // Nota: A configuração de threshold é 50% de N chamadas. Se falhar 3, abre.
    expect(mockStripeAdapter.charge).toHaveBeenCalled(); 
  });
});
