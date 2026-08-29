import { CHAT_MESSAGE_SENT_EVENT, MessageSentEvent } from '@app/constracts';
import { Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ChatEventsPublisher } from '../../../apps/chat/src/chatEvents.publisher';

describe('ChatEventsPublisher', () => {
  const client = { emit: jest.fn() };
  const publisher = new ChatEventsPublisher(client as never);
  const loggerError = jest
    .spyOn(Logger.prototype, 'error')
    .mockImplementation();
  const event: MessageSentEvent = {
    id: 'message-id',
    conversationId: 'conversation-id',
    participantId: 'user-id',
    content: 'hello',
    replyTo: null,
    createdAt: new Date('2026-08-28T12:00:00.000Z'),
  };

  beforeEach(() => jest.clearAllMocks());

  it('publishes the persisted message event', async () => {
    client.emit.mockReturnValue(of(undefined));

    await publisher.messageSent(event);

    expect(client.emit).toHaveBeenCalledWith(CHAT_MESSAGE_SENT_EVENT, event);
  });

  it('logs publish failures without rejecting the completed request', async () => {
    client.emit.mockReturnValue(
      throwError(() => new Error('RabbitMQ unavailable')),
    );

    await expect(publisher.messageSent(event)).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('was persisted'),
      expect.any(String),
    );
  });
});
