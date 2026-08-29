import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from '../middlewares/webSocketAuth.middleware';

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<AuthenticatedSocket>();
    const error = this.normalize(exception);

    client.emit('sendMessageError', error);
  }

  private normalize(exception: unknown): Record<string, unknown> {
    if (exception instanceof WsException) {
      const error = exception.getError();
      return typeof error === 'string'
        ? { code: 'WS_ERROR', message: error }
        : { code: 'WS_ERROR', ...error };
    }

    if (typeof exception === 'object' && exception !== null) {
      const candidate = exception as {
        error?: unknown;
        message?: unknown;
        status?: unknown;
      };
      const rpcError = candidate.error;

      if (typeof rpcError === 'object' && rpcError !== null) {
        return { code: 'MESSAGE_SEND_FAILED', ...rpcError };
      }

      if (typeof candidate.message === 'string') {
        return {
          code: 'MESSAGE_SEND_FAILED',
          message: candidate.message,
          status: candidate.status,
        };
      }
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected WebSocket error occurred',
    };
  }
}
