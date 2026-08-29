import { ConflictException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ChatExceptionFilter } from '../../../apps/chat/src/filters/chatException.filter';
import {
  ConversationNotFoundException,
  NotAConversationParticipantException,
} from '../../../apps/chat/src/exceptions';

describe('ChatExceptionFilter', () => {
  const filter = new ChatExceptionFilter();
  jest.spyOn(Logger.prototype, 'error').mockImplementation();

  const getRpcError = async (exception: unknown) => {
    try {
      await firstValueFrom(filter.catch(exception, {} as never));
    } catch (error) {
      return (error as RpcException).getError();
    }
  };

  it('maps invalid participants to conflict', async () => {
    await expect(
      getRpcError(
        new ConflictException(
          'One or more conversation participant IDs are invalid',
        ),
      ),
    ).resolves.toEqual({
      errorMessage: 'One or more conversation participant IDs are invalid',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('maps MongoDB duplicate keys to conflict without leaking details', async () => {
    const error = Object.assign(new Error('raw database details'), {
      code: 11000,
    });

    await expect(getRpcError(error)).resolves.toEqual({
      errorMessage: 'Conversation already exists',
      statusCode: HttpStatus.CONFLICT,
    });
  });

  it('maps unknown errors to internal server error', async () => {
    await expect(
      getRpcError(new Error('RabbitMQ unavailable')),
    ).resolves.toEqual({
      errorMessage: 'Internal server error',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });

  it('maps message domain exceptions to their HTTP status', async () => {
    await expect(
      getRpcError(new ConversationNotFoundException()),
    ).resolves.toEqual({
      errorMessage: 'Conversation not found',
      statusCode: HttpStatus.NOT_FOUND,
    });
    await expect(
      getRpcError(new NotAConversationParticipantException()),
    ).resolves.toEqual({
      errorMessage: 'You are not a participant of this conversation',
      statusCode: HttpStatus.FORBIDDEN,
    });
  });
});
