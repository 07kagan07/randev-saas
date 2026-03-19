import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Bir hata oluştu, lütfen tekrar deneyin.';
    let message_en = 'An error occurred, please try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;

      if (typeof exceptionResponse === 'object') {
        code = exceptionResponse.code || exceptionResponse.error || code;
        message = exceptionResponse.message || message;
        message_en = exceptionResponse.message_en || message_en;

        // class-validator hataları
        if (Array.isArray(exceptionResponse.message)) {
          message = exceptionResponse.message[0];
          message_en = exceptionResponse.message[0];
        }
      } else {
        message = exceptionResponse;
        message_en = exceptionResponse;
      }
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        message_en,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }
}
