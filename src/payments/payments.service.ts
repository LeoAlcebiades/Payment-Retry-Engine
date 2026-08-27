import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PaymentEntity, PaymentStatus } from './payment.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly paymentRepository: Repository<PaymentEntity>,
    // CORREÇÃO: Injetando a fila de processamento assíncrono para garantir que o pagamento seja processado fora da requisição HTTP
    @InjectQueue('payment-retry')
    private readonly paymentQueue: Queue,
  ) {}

  async createPayment(amount: number, customerId: string, idempotencyKey: string) {
    try {
      const payment = this.paymentRepository.create({
        amount,
        customerId,
        idempotencyKey,
        status: PaymentStatus.PENDING,
      });

      const savedPayment = await this.paymentRepository.save(payment);

      // EVOLUÇÃO DE FLUXO: Enfileira o job para o processador consumir de forma assíncrona.
      // O jobId é igual ao ID do pagamento para prevenir que o mesmo pagamento seja processado mais de uma vez simultaneamente.
      await this.paymentQueue.add('process-payment', { paymentId: savedPayment.id }, {
        jobId: savedPayment.id,
      });

      this.logger.log(`Pagamento ${savedPayment.id} registrado e enfileirado com sucesso.`);

      return savedPayment;
    } catch (error: any) {
      // Tratamento otimizado: apenas busca se realmente houver violação de chave, de forma performática
      if (error.code === '23505') {
        this.logger.warn(`Tentativa duplicada de chave: ${idempotencyKey}`);
        return await this.paymentRepository.findOneBy({ idempotencyKey });
      }
      
      throw error;
    }
  }

  // MÉTODO DE RESILIÊNCIA: Define quais erros do gateway de pagamento não devem sofrer novas tentativas (retry)
  canRetry(errorCode: string): boolean {
    const nonRetryableErrors = [
      'card_declined',
      'expired_card',
      'incorrect_cvc',
      'insufficient_funds',
      'incorrect_number',
      'INSUFFICIENT_FUNDS',
      'CARD_EXPIRED',
      'INVALID_CVV'
    ];
    
    return !nonRetryableErrors.includes(errorCode);
  }
}