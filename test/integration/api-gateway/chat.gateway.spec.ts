import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { of } from 'rxjs';
import type { Server as HttpServer } from 'node:http';
import { ChatGateway } from '../../../apps/api-gateway/src/chat/chat.gateway';
import {
  AuthenticatedSocket,
  WebSocketAuthMiddleware,
} from '../../../apps/api-gateway/src/common/middlewares/webSocketAuth.middleware';
import { WsJwtGuard } from '../../../apps/api-gateway/src/common/guards/ws-jwt.guard';

describe('ChatGateway (integration)', () => {
  const conversationId = '68b000000000000000000010';
  let app: INestApplication;
  let module: TestingModule;
  let sender: Socket;
  let recipient: Socket;

  beforeAll(async () => {
    const chatClient = {
      send: jest.fn().mockReturnValue(
        of({
          _id: '68b000000000000000000011',
          content: 'hello over sockets',
          replyTo: null,
          createdAt: new Date('2026-08-29T12:00:00.000Z'),
        }),
      ),
    };
    const authMiddleware = {
      authenticate: jest.fn(
        (socket: AuthenticatedSocket, next: (error?: Error) => void) => {
          const userId = String(socket.handshake.auth.token);
          socket.data.user = { sub: userId };
          socket.data.userId = userId;
          socket.data.conversationIds = [`conversation:${conversationId}`];
          next();
        },
      ),
    };

    module = await Test.createTestingModule({
      providers: [
        ChatGateway,
        WsJwtGuard,
        { provide: 'CHAT_SERVICE', useValue: chatClient },
        { provide: WebSocketAuthMiddleware, useValue: authMiddleware },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0);

    const address = (app.getHttpServer() as HttpServer).address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected the test server to listen on a TCP port');
    }
    const port = address.port;
    const url = `http://127.0.0.1:${port}`;

    sender = io(url, {
      auth: { token: 'sender-id' },
      transports: ['websocket'],
    });
    recipient = io(url, {
      auth: { token: 'recipient-id' },
      transports: ['websocket'],
    });
    await Promise.all([
      new Promise<void>((resolve) => sender.on('connect', resolve)),
      new Promise<void>((resolve) => recipient.on('connect', resolve)),
    ]);
  });

  afterAll(async () => {
    sender?.disconnect();
    recipient?.disconnect();
    await app?.close();
    await module?.close();
  });

  it('delivers a persisted message to another client in the room and acks the sender', async () => {
    const received = new Promise<Record<string, unknown>>((resolve) =>
      recipient.once('newMessage', resolve),
    );
    const acknowledged = new Promise<Record<string, unknown>>((resolve) =>
      sender.once('sendMessageAck', resolve),
    );

    sender.emit('sendMessage', {
      conversationId,
      content: 'hello over sockets',
    });

    await expect(received).resolves.toEqual(
      expect.objectContaining({
        conversationId,
        content: 'hello over sockets',
        participantId: 'sender-id',
      }),
    );
    await expect(acknowledged).resolves.toEqual(
      expect.objectContaining({ ok: true }),
    );
  });
});
