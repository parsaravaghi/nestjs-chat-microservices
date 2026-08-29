import {
  ConversationCreatedEvent,
  ConversationType,
  MessageSentEvent,
  WEBSOCKET_CONVERSATION_CREATED_EVENT,
  WEBSOCKET_MESSAGE_SENT_EVENT,
} from '@app/constracts';
import { Logger } from '@nestjs/common';
import { ChatEventsController } from '../../../apps/api-gateway/src/chat/chatEvents.controller';
import { ChatGateway } from '../../../apps/api-gateway/src/chat/chat.gateway';
import { AuthenticatedSocket } from '../../../apps/api-gateway/src/common/middlewares/webSocketAuth.middleware';
import { of, throwError } from 'rxjs';

describe('ChatGateway', () => {
  const authMiddleware = { authenticate: jest.fn() };
  const chatClient = { send: jest.fn() };
  const gateway = new ChatGateway(authMiddleware as never, chatClient as never);
  const emit = jest.fn();
  const to = jest.fn().mockReturnValue({ emit });
  const fetchSockets = jest.fn();
  const inRoom = jest.fn().mockReturnValue({ fetchSockets });
  const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
  const debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSockets.mockResolvedValue([]);
    Object.assign(gateway, { server: { to, in: inRoom } });
  });

  it('joins the authenticated socket to its user room', async () => {
    const join = jest.fn().mockResolvedValue(undefined);
    const disconnect = jest.fn();
    const client = {
      data: { userId: 'user-id' },
      join,
      disconnect,
    } as unknown as AuthenticatedSocket;

    await gateway.handleConnection(client);

    expect(join).toHaveBeenCalledWith(['user:user-id']);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('disconnects a socket without an authenticated identity', async () => {
    const join = jest.fn();
    const disconnect = jest.fn();
    const client = {
      data: {},
      join,
      disconnect,
    } as unknown as AuthenticatedSocket;

    await gateway.handleConnection(client);

    expect(disconnect).toHaveBeenCalledWith(true);
    expect(join).not.toHaveBeenCalled();
  });

  it('joins all active participant sockets and emits to personal rooms', async () => {
    const firstSocket = {
      id: 'socket-1',
      join: jest.fn().mockResolvedValue(undefined),
    };
    const secondSocket = {
      id: 'socket-2',
      join: jest.fn().mockResolvedValue(undefined),
    };
    inRoom.mockImplementation((room: string) => ({
      fetchSockets: jest
        .fn()
        .mockResolvedValue(
          room === 'user:user-1' ? [firstSocket, secondSocket] : [],
        ),
    }));
    const event: ConversationCreatedEvent = {
      participantIds: ['user-1', 'user-2', 'user-1'],
      conversation: {
        id: 'conversation-id',
        createdBy: 'user-1',
        type: ConversationType.PRIVATE,
        participantIds: ['user-1', 'user-2'],
      },
    };
    const controller = new ChatEventsController(gateway);

    await controller.handleConversationCreated(event);

    expect(inRoom).toHaveBeenCalledTimes(2);
    expect(inRoom).toHaveBeenCalledWith('user:user-1');
    expect(inRoom).toHaveBeenCalledWith('user:user-2');
    expect(firstSocket.join).toHaveBeenCalledWith(
      'conversation:conversation-id',
    );
    expect(secondSocket.join).toHaveBeenCalledWith(
      'conversation:conversation-id',
    );
    expect(log).toHaveBeenCalledWith(
      'User user-1 joined conversation conversation-id using socket socket-1',
    );
    expect(log).toHaveBeenCalledWith(
      'User user-1 joined conversation conversation-id using socket socket-2',
    );
    expect(debug).toHaveBeenCalledWith(
      'User user-2 has no connected sockets for conversation conversation-id',
    );

    expect(to).toHaveBeenCalledTimes(2);
    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(to).toHaveBeenCalledWith('user:user-2');
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith(
      WEBSOCKET_CONVERSATION_CREATED_EVENT,
      event.conversation,
    );
  });

  it('continues joining and emitting when one socket join fails', async () => {
    const failedSocket = {
      id: 'failed-socket',
      join: jest.fn().mockRejectedValue(new Error('adapter failure')),
    };
    const joinedSocket = {
      id: 'joined-socket',
      join: jest.fn().mockResolvedValue(undefined),
    };
    inRoom.mockReturnValue({
      fetchSockets: jest.fn().mockResolvedValue([failedSocket, joinedSocket]),
    });
    const event: ConversationCreatedEvent = {
      participantIds: ['user-1'],
      conversation: {
        id: 'conversation-id',
        createdBy: 'user-1',
        type: ConversationType.GROUP as ConversationType,
        participantIds: ['user-1'],
      },
    };

    await gateway.emitConversationCreated(event);

    expect(joinedSocket.join).toHaveBeenCalledWith(
      'conversation:conversation-id',
    );
    expect(error).toHaveBeenCalledWith(
      'Socket failed-socket for user user-1 could not join conversation conversation-id',
      expect.any(String),
    );
    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emit).toHaveBeenCalledWith(
      WEBSOCKET_CONVERSATION_CREATED_EVENT,
      event.conversation,
    );
  });

  it('emits sent messages only to the matching conversation room', () => {
    const event: MessageSentEvent = {
      id: 'message-id',
      conversationId: 'conversation-id',
      participantId: 'user-id',
      content: 'hello',
      replyTo: null,
      createdAt: new Date('2026-08-28T12:00:00.000Z'),
    };
    const controller = new ChatEventsController(gateway);

    controller.handleMessageSent(event);

    expect(to).toHaveBeenCalledWith('conversation:conversation-id');
    expect(emit).toHaveBeenCalledWith(WEBSOCKET_MESSAGE_SENT_EVENT, event);
  });

  it('persists a socket message, broadcasts it, and acknowledges the sender', async () => {
    const createdAt = new Date('2026-08-28T12:00:00.000Z');
    chatClient.send.mockReturnValue(
      of({
        _id: 'message-id',
        content: 'hello',
        replyTo: null,
        createdAt,
      }),
    );
    const clientEmit = jest.fn();
    const client = {
      data: { user: { sub: 'user-id' }, userId: 'user-id' },
      emit: clientEmit,
    } as unknown as AuthenticatedSocket;

    await gateway.sendMessage(client, {
      conversationId: '68b000000000000000000010',
      content: 'hello',
    });

    expect(chatClient.send).toHaveBeenCalledWith('chat.sendMessage', {
      conversationId: '68b000000000000000000010',
      userId: 'user-id',
      dto: { content: 'hello', replyTo: undefined },
      publishEvent: false,
    });
    expect(to).toHaveBeenCalledWith('conversation:68b000000000000000000010');
    expect(emit).toHaveBeenCalledWith(
      WEBSOCKET_MESSAGE_SENT_EVENT,
      expect.objectContaining({ id: 'message-id', content: 'hello' }),
    );
    expect(clientEmit).toHaveBeenCalledWith(
      'sendMessageAck',
      expect.objectContaining({ ok: true }),
    );
  });

  it('does not acknowledge or broadcast when persistence fails', async () => {
    chatClient.send.mockReturnValue(throwError(() => new Error('failed')));
    const clientEmit = jest.fn();
    const client = {
      data: { user: { sub: 'user-id' }, userId: 'user-id' },
      emit: clientEmit,
    } as unknown as AuthenticatedSocket;

    await expect(
      gateway.sendMessage(client, {
        conversationId: '68b000000000000000000010',
        content: 'hello',
      }),
    ).rejects.toThrow('failed');
    expect(to).not.toHaveBeenCalled();
    expect(clientEmit).not.toHaveBeenCalled();
  });
});
