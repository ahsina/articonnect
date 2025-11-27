import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { TracingService, SpanStatusCode } from './tracing.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

@Injectable()
export class TracingInterceptor implements NestInterceptor {
  constructor(private readonly tracingService: TracingService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.tracingService.isInitialized()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // Create span name from controller and method
    const spanName = `${className}.${methodName}`;

    // Extract attributes
    const attributes: Record<string, string | number | boolean> = {
      'http.method': request.method,
      'http.url': request.url,
      'http.route': request.route?.path || request.url,
      'controller': className,
      'handler': methodName,
    };

    // Add user context if available
    if (request.user) {
      attributes['user.id'] = request.user.id;
      if (request.user.role) {
        attributes['user.role'] = request.user.role;
      }
    }

    // Add request ID if present
    const requestId = request.headers['x-request-id'] as string;
    if (requestId) {
      attributes['request.id'] = requestId;
    }

    const span = this.tracingService.startSpan(spanName, { attributes });

    if (!span) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          span.setAttribute('http.response_time_ms', duration);
          span.setStatus({ code: SpanStatusCode.OK });
          span.end();
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          span.setAttribute('http.response_time_ms', duration);
          span.recordException(error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message,
          });
          span.end();
        },
      }),
    );
  }
}
