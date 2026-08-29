import {
  ConversationCreatedEvent,
  MessageSentEvent,
  WEBSOCKET_CONVERSATION_CREATED_EVENT,
  WEBSOCKET_MESSAGE_SENT_EVENT,
} from '@app/constracts';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  Inject,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Server } from 'socket.io';
import { firstValueFrom } from 'rxjs';
import { WebSocketAuthMiddleware } from '../common/middlewares/webSocketAuth.middleware';
import type { AuthenticatedSocket } from '../common/middlewares/webSocketAuth.middleware';
import {
  getConversationRoom,
  getUserRoom,
} from '../common/utils/userRoom.util';
import { SendMessageWsDto } from './dto/send-message-ws.dto';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { WsValidationPipe } from '../common/pipes/ws-validation.pipe';
import { WsExceptionFilter } from '../common/filters/ws-exception.filter';

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  transports: ['websocket', 'polling'],
})
@UseFilters(WsExceptionFilter)
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly webSocketAuthMiddleware: WebSocketAuthMiddleware,
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientProxy,
  ) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.webSocketAuthMiddleware.authenticate(
        socket as AuthenticatedSocket,
        next,
      );
    });
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const { userId, conversationIds = [] } = client.data;

    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join([getUserRoom(userId), ...conversationIds]);
    this.logger.log(`User ${userId} connected using socket ${client.id}`);
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const userId = client.data.userId;
    this.logger.log(
      userId
        ? `User ${userId} disconnected from socket ${client.id}`
        : `Unauthenticated socket ${client.id} disconnected`,
    );
  }

  @SubscribeMessage('sendMessage')
  @UseGuards(WsJwtGuard)
  @UsePipes(WsValidationPipe)
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: SendMessageWsDto,
  ): Promise<void> {
    const message = await firstValueFrom(
      this.chatClient.send<{
        _id: { toString(): string } | string;
        content: string;
        replyTo?: { toString(): string } | string | null;
        createdAt: Date;
      }>('chat.sendMessage', {
        conversationId: payload.conversationId,
        userId: client.data.user!.sub,
        dto: { content: payload.content, replyTo: payload.replyTo },
        publishEvent: false,
      }),
    );

    const event: MessageSentEvent = {
      id: message._id.toString(),
      conversationId: payload.conversationId,
      participantId: client.data.user!.sub,
      content: message.content,
      replyTo: message.replyTo?.toString() ?? null,
      createdAt: message.createdAt,
    };

    this.emitMessageSent(event);
    client.emit('sendMessageAck', { ok: true, message: event });
  }

  async joinParticipantsToConversation(
    participantIds: string[],
    conversationId: string,
  ): Promise<void> {
    const conversationRoom = getConversationRoom(conversationId);

    for (const participantId of new Set(participantIds)) {
      let sockets: Awaited<
        ReturnType<ReturnType<Server['in']>['fetchSockets']>
      >;

      try {
        sockets = await this.server
          .in(getUserRoom(participantId))
          .fetchSockets();
      } catch (error) {
        this.logger.error(
          `Could not retrieve sockets for user ${participantId} while joining conversation ${conversationId}`,
          error instanceof Error ? error.stack : undefined,
        );
        continue;
      }

      if (sockets.length === 0) {
        this.logger.debug(
          `User ${participantId} has no connected sockets for conversation ${conversationId}`,
        );
        continue;
      }

      for (const socket of sockets) {
        try {
          await Promise.resolve(socket.join(conversationRoom));
          this.logger.log(
            `User ${participantId} joined conversation ${conversationId} using socket ${socket.id}`,
          );
        } catch (error) {
          this.logger.error(
            `Socket ${socket.id} for user ${participantId} could not join conversation ${conversationId}`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }
    }
  }

  async emitConversationCreated(
    event: ConversationCreatedEvent,
  ): Promise<void> {
    await this.joinParticipantsToConversation(
      event.participantIds,
      event.conversation.id,
    );

    for (const participantId of new Set(event.participantIds)) {
      this.server
        .to(getUserRoom(participantId))
        .emit(WEBSOCKET_CONVERSATION_CREATED_EVENT, event.conversation);
    }
  }

  emitMessageSent(event: MessageSentEvent): void {
    this.server
      .to(getConversationRoom(event.conversationId))
      .emit(WEBSOCKET_MESSAGE_SENT_EVENT, event);
  }
}
