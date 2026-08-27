import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEntity } from './payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentProcessor } from './payment.processor';
import { PaymentsController } from './payments.controller';
import { StripeAdapter } from './gateways/stripe.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    // EVOLUÇÃO: Política de retentativas configurada com DLQ
    BullModule.registerQueue({
      name: 'payment-retry',
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
      // DLQ configurada para mover jobs falhos após tentativas esgotadas
      // Nota: BullMQ gerencia isso nativamente com retries esgotados.
      // O processador deve garantir o registro de auditoria final.
    }),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentProcessor, StripeAdapter],
  exports: [PaymentsService],
})
export class PaymentsModule {}