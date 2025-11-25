import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import { ErrorCodes, StandardErrorResponse } from '../interfaces/error-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';
    let code: string | undefined;
    let validationErrors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        message = resp.message || message;
        error = resp.error || error;
        code = resp.code;
        validationErrors = resp.validationErrors;
      }

      // Map HTTP status to error codes if not provided
      if (!code) {
        code = this.mapStatusToErrorCode(status, error);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      code = ErrorCodes.INTERNAL_ERROR;
    }

    // Log error (sanitize for production)
    const logMessage = Array.isArray(message) ? message.join(', ') : message;
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${logMessage}`,
      exception instanceof Error ? exception.stack : undefined,
      'ExceptionFilter',
    );

    // Build standardized response
    const errorResponse: StandardErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    };

    if (code) {
      errorResponse.code = code;
    }

    if (validationErrors) {
      (errorResponse as any).validationErrors = validationErrors;
    }

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Map HTTP status codes to error codes for consistency
   */
  private mapStatusToErrorCode(status: number, error: string): string | undefined {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.AUTH_INVALID_CREDENTIALS;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.AUTHZ_FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.RESOURCE_CONFLICT;
      case HttpStatus.BAD_REQUEST:
        if (error.toLowerCase().includes('validation')) {
          return ErrorCodes.VALIDATION_FAILED;
        }
        return undefined;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.RATE_LIMIT_EXCEEDED;
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return ErrorCodes.INTERNAL_ERROR;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return undefined;
    }
  }
}
