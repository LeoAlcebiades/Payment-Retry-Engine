import { IsNumber, IsUUID, IsNotEmpty, IsPositive, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// EVOLUÇÃO DE SEGURANÇA: Data Transfer Object (DTO) para garantir que apenas dados válidos entrem no fluxo de negócio
export class CreatePaymentDto {
  // O valor do pagamento deve ser um número positivo com no máximo duas casas decimais
  @ApiProperty({ description: 'Valor do pagamento em reais', example: 100.50 })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número decimal válido com até duas casas decimais.' })
  @IsPositive({ message: 'O valor do pagamento deve ser maior do que zero.' })
  @Max(999999.99, { message: 'O valor do pagamento excede o limite máximo permitido de R$ 999.999,99.' })
  amount!: number;

  // O ID do cliente deve ser fornecido e não pode ser vazio
  @ApiProperty({ description: 'UUID do cliente', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsNotEmpty({ message: 'O ID do cliente (customerId) é obrigatório.' })
  customerId!: string;

  // A chave de idempotência é crucial para a segurança contra cobranças duplicadas, devendo ser um UUID válido
  @ApiProperty({ description: 'Chave única de idempotência para evitar cobranças duplas', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: 'A chave de idempotência (idempotencyKey) deve ser um UUID v4 válido.' })
  @IsNotEmpty({ message: 'A chave de idempotência (idempotencyKey) é obrigatória.' })
  idempotencyKey!: string;
}