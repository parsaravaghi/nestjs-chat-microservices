import { Injectable, ValidationPipe } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';

@Injectable()
export class WsValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) =>
        new WsException({
          code: 'VALIDATION_ERROR',
          message: 'WebSocket payload validation failed',
          details: errors.map(({ property, constraints }) => ({
            property,
            constraints,
          })),
        }),
    });
  }
}
