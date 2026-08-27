import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

// EVOLUÇÃO DE PROFISSIONALISMO: Filtro global para padronizar todas as respostas de erro da API
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? (exception.getResponse() as any).message || exception.message
        : 'Internal server error';

    this.logger.error(`Error occurred: ${message}`);

    // EVOLUÇÃO DE SEGURANÇA: Não expõe detalhes da exception (stack trace) ou path da requisição
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: status === HttpStatus.INTERNAL_SERVER_ERROR ? 'Internal server error' : message,
    });
  }
}