import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthenticatedSocket } from '../middlewares/webSocketAuth.middleware';

@Injectable()
export class WsJwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<AuthenticatedSocket>();

    if (!client.data.user?.sub) {
      throw new WsException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      });
    }

    return true;
  }
}
