import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeAdapter {
  private readonly logger = new Logger(StripeAdapter.name);
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mockkey', {
      apiVersion: '2025-02-28.acacia' as any,
    });
  }

  // CORREÇÃO: Recebendo a chave de idempotência para evitar cobranças duplicadas em re-tentativas
  async charge(amount: number, customerId: string, idempotencyKey: string): Promise<any> {
    try {
      this.logger.log(`Enviando cobrança de R$ ${amount} para o gateway Stripe...`);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Conversão para centavos (padrão Stripe)
        currency: 'brl',
        payment_method: 'pm_card_visa',
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
      }, {
        // EVOLUÇÃO DE SEGURANÇA: Passando a chave de idempotência para a Stripe
        idempotencyKey,
      });

      return {
        success: true,
        transactionId: paymentIntent.id,
      };
    } catch (error: any) {
      this.logger.error(`Erro retornado pelo Stripe: ${error.message}`);
      
      // Repassamos o código do erro para o PaymentProcessor decidir sobre a retentativa
      throw new Error(error.raw?.code || 'GATEWAY_TIMEOUT');
    }
  }
}