import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria um novo pagamento' })
  @ApiResponse({ status: 201, description: 'Pagamento criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  // CORREÇÃO E SEGURANÇA: Usando o CreatePaymentDto com validação automática via Pipes em vez de um objeto genérico não verificado
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    // Repassa os dados validados estritamente para a camada de serviço
    return this.paymentsService.createPayment(
      createPaymentDto.amount,
      createPaymentDto.customerId,
      createPaymentDto.idempotencyKey,
    );
  }
}