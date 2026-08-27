import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PaymentEntity, PaymentStatus } from './payment.entity';
import { StripeAdapter } from './gateways/stripe.adapter';
import { PaymentsService } from './payments.service';
import { RedisService } from '../common/cache/redis.service';
import * as CircuitBreaker from 'opossum';

@Injectable()
@Processor('payment-retry')
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);
  private readonly breaker: any;

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    private readonly stripeAdapter: StripeAdapter,
    private readonly paymentsService: PaymentsService,
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {
    super();

    // Configuração do Circuit Breaker
    const options = {
      timeout: 10000, 
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    };
    
    const BreakerClass = (CircuitBreaker as any).default || CircuitBreaker;
    this.breaker = new BreakerClass(this.stripeAdapter.charge.bind(this.stripeAdapter), options);
    this.breaker.fallback(() => { throw new Error('CIRCUIT_OPEN'); });
  }

  async process(job: Job<{ paymentId: string }>): Promise<any> {
    const { paymentId } = job.data;
    const attempt = job.attemptsMade + 1;
    this.logger.log(`[Job ${job.id}] Processando ID: ${paymentId} (Tentativa ${attempt})`);

    const isProcessed = await this.redisService.get(`idempotency:${paymentId}`);
    if (isProcessed) return;

    return await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(PaymentEntity, { where: { id: paymentId }, lock: { mode: 'pessimistic_write' } });
      
      if (!payment) return;

      if (payment.status === PaymentStatus.SUCCEEDED || payment.status === PaymentStatus.EXHAUSTED) return;

      payment.status = PaymentStatus.PROCESSING;
      await manager.save(payment);

      try {
        // Chamada protegida pelo Circuit Breaker
        const result = await this.breaker.fire(payment.amount, payment.customerId, payment.idempotencyKey);

        payment.status = PaymentStatus.SUCCEEDED;
        await manager.save(payment);
        await this.redisService.set(`idempotency:${paymentId}`, 'true', 86400);
        return result;

      } catch (error: any) {
        payment.lastError = error.message;
        const isLastAttempt = attempt >= (job.opts.attempts || 5);

        // Lógica de DLQ: Se última tentativa, marca como EXHAUSTED e isola
        if (!this.paymentsService.canRetry(error.message) || isLastAttempt) {
          payment.status = PaymentStatus.EXHAUSTED;
          this.logger.error(`[DLQ] Pagamento ${paymentId} movido para DLQ. Erro: ${error.message}`);
        } else {
          payment.status = PaymentStatus.FAILED;
        }

        await manager.save(payment);
        throw error;
      }
    });
  }
}
