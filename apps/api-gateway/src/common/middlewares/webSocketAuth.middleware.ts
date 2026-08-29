import { IPayload } from '@app/constracts';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Socket } from 'socket.io';
import { getConversationRoom } from '../utils/userRoom.util';

export interface AuthenticatedSocketData {
  user?: IPayload;
  userId?: string;
  conversationIds: string[];
}

interface ServerToClientEvents {
  sendMessageAck(payload: unknown): void;
  sendMessageError(payload: unknown): void;
}

export type AuthenticatedSocket = Socket<
  Record<string, never>,
  ServerToClientEvents,
  Record<string, never>,
  AuthenticatedSocketData
>;

type NextFunction = (error?: Error) => void;

@Injectable()
export class WebSocketAuthMiddleware {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,

    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  async authenticate(
    socket: AuthenticatedSocket,
    next: NextFunction,
  ): Promise<void> {
    const token = this.extractToken(socket);

    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = await firstValueFrom(
        this.authClient.send<IPayload>('auth.validateToken', token),
      );

      if (!payload.sub) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.user = payload;
      socket.data.userId = payload.sub;

      const conversationIds = await firstValueFrom(
        this.chatClient.send<string[]>('chat.myConversationIds', payload.sub),
      );

      socket.data.conversationIds = conversationIds.map((conversationId) => {
        return getConversationRoom(conversationId);
      });

      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  }

  private extractToken(socket: AuthenticatedSocket): string | undefined {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;
    const queryToken = socket.handshake.query?.token;

    if (typeof authToken === 'string' && authToken.length > 0) {
      return this.stripOptionalBearerPrefix(authToken);
    }

    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return this.stripOptionalBearerPrefix(queryToken);
    }

    return this.extractBearerToken(socket.handshake.headers.authorization);
  }

  private stripOptionalBearerPrefix(token: string): string {
    return token.startsWith('Bearer ') ? token.slice(7) : token;
  }

  private extractBearerToken(
    authorization: string | string[] | undefined,
  ): string | undefined {
    if (typeof authorization !== 'string') {
      return;
    }

    const [scheme, token, extra] = authorization.split(' ');

    return scheme === 'Bearer' && token && !extra ? token : undefined;
  }
}
