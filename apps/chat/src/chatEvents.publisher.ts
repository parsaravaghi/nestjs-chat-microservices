import {
  CHAT_CONVERSATION_CREATED_EVENT,
  CHAT_MESSAGE_SENT_EVENT,
  ConversationCreatedEvent,
  MessageSentEvent,
} from '@app/constracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ChatEventsPublisher {
  private readonly logger = new Logger(ChatEventsPublisher.name);

  constructor(
    @Inject('API_GATEWAY_SERVICE')
    private readonly apiGatewayClient: ClientProxy,
  ) {}

  async conversationCreated(event: ConversationCreatedEvent): Promise<void> {
    try {
      await lastValueFrom(
        this.apiGatewayClient.emit(CHAT_CONVERSATION_CREATED_EVENT, event),
      );
    } catch (error) {
      this.logger.error(
        'Conversation was persisted, but its notification could not be published',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async messageSent(event: MessageSentEvent): Promise<void> {
    try {
      await lastValueFrom(
        this.apiGatewayClient.emit(CHAT_MESSAGE_SENT_EVENT, event),
      );
    } catch (error) {
      // Persistence already succeeded, so notification failure is non-fatal.
      this.logger.error(
        `Message ${event.id} was persisted, but its conversation notification could not be published`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
