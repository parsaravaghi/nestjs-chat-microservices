import { ConversationType } from '@app/constracts';
import { ConflictException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ChatService } from '../../../apps/chat/src/chat.service';
import { ParticipantRole } from '../../../apps/chat/src/enum/participantRole.enum';
import { Types } from 'mongoose';
import { ConversationSchema } from '../../../apps/chat/src/schemas/conversation.schema';
import {
  ConversationNotFoundException,
  NotAConversationParticipantException,
} from '../../../apps/chat/src/exceptions';

describe('ChatService', () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
    inTransaction: jest.fn().mockReturnValue(true),
  };
  const userClient = { send: jest.fn() };
  const connection = { startSession: jest.fn().mockResolvedValue(session) };
  const conversationModel = {
    create: jest.fn(),
    aggregate: jest.fn(),
    collection: { name: 'conversations' },
  };
  const participantsModel = {
    insertMany: jest.fn(),
    aggregate: jest.fn(),
    collection: { name: 'participants' },
  };
  const messageModel = { create: jest.fn() };
  const conversationEventsPublisher = {
    conversationCreated: jest.fn(),
    messageSent: jest.fn(),
  };
  const service = new ChatService(
    userClient as never,
    connection as never,
    conversationModel as never,
    participantsModel as never,
    messageModel as never,
    conversationEventsPublisher as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    session.inTransaction.mockReturnValue(true);
  });

  it('deduplicates IDs and commits both writes in one session', async () => {
    userClient.send.mockReturnValue(of([{ id: 'creator' }, { id: 'invited' }]));
    conversationModel.create.mockResolvedValue([
      {
        _id: 'conversation-id',
        created_by: 'creator',
        type: ConversationType.PRIVATE,
      },
    ]);
    participantsModel.insertMany.mockResolvedValue([{ userId: 'creator' }]);

    await service.createConversation({
      userId: 'creator',
      dto: {
        type: ConversationType.PRIVATE,
        participantIds: ['creator', 'invited', 'invited'],
      },
    });

    expect(userClient.send).toHaveBeenCalledWith('user.findByIds', {
      ids: ['creator', 'invited'],
    });
    expect(conversationModel.create).toHaveBeenCalledWith(
      [expect.objectContaining({ idempotencyKey: 'creator:invited' })],
      { session },
    );
    expect(participantsModel.insertMany).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          userId: 'creator',
          role: ParticipantRole.OWNER,
        }),
        expect.objectContaining({
          userId: 'invited',
          role: ParticipantRole.MEMBER,
        }),
      ],
      { session },
    );
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(
      conversationEventsPublisher.conversationCreated,
    ).toHaveBeenCalledWith({
      participantIds: ['creator', 'invited'],
      conversation: {
        id: 'conversation-id',
        createdBy: 'creator',
        type: ConversationType.PRIVATE,
        participantIds: ['creator', 'invited'],
        title: undefined,
        description: undefined,
      },
    });
    expect(session.commitTransaction.mock.invocationCallOrder[0]).toBeLessThan(
      conversationEventsPublisher.conversationCreated.mock
        .invocationCallOrder[0],
    );
  });

  it('rejects missing users before opening a MongoDB session', async () => {
    userClient.send.mockReturnValue(of([{ id: 'creator' }]));

    await expect(
      service.createConversation({
        userId: 'creator',
        dto: {
          type: ConversationType.PRIVATE,
          participantIds: ['missing'],
        },
      }),
    ).rejects.toThrow(ConflictException);
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('aborts and rethrows duplicate-key failures for the filter', async () => {
    userClient.send.mockReturnValue(of([{ id: 'creator' }, { id: 'invited' }]));
    const duplicateError = Object.assign(new Error('duplicate'), {
      code: 11000,
    });
    conversationModel.create.mockRejectedValue(duplicateError);

    await expect(
      service.createConversation({
        userId: 'creator',
        dto: {
          type: ConversationType.PRIVATE,
          participantIds: ['invited'],
        },
      }),
    ).rejects.toBe(duplicateError);
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.endSession).toHaveBeenCalled();
    expect(
      conversationEventsPublisher.conversationCreated,
    ).not.toHaveBeenCalled();
  });

  it('does not perform MongoDB writes when user lookup fails', async () => {
    userClient.send.mockReturnValue(
      throwError(() => new Error('RabbitMQ unavailable')),
    );

    await expect(
      service.createConversation({
        userId: 'creator',
        dto: {
          type: ConversationType.PRIVATE,
          participantIds: ['invited'],
        },
      }),
    ).rejects.toThrow('RabbitMQ unavailable');
    expect(connection.startSession).not.toHaveBeenCalled();
  });

  it('maps private peers and batches deduplicated profile retrieval', async () => {
    const updatedAt = new Date('2026-08-28T10:00:00.000Z');
    participantsModel.aggregate.mockResolvedValue([
      {
        _id: new Types.ObjectId('68b000000000000000000001'),
        type: ConversationType.PRIVATE,
        updatedAt,
        participants: [{ userId: 'me' }, { userId: 'peer' }],
      },
      {
        _id: new Types.ObjectId('68b000000000000000000002'),
        type: ConversationType.PRIVATE,
        updatedAt,
        participants: [{ userId: 'peer' }, { userId: 'me' }],
      },
    ]);
    userClient.send.mockReturnValue(
      of([
        {
          id: 'peer',
          username: 'john',
          displayName: 'John Smith',
          avatarUrl: 'avatar.jpg',
        },
      ]),
    );

    const result = await service.myConversations({ userId: 'me', limit: 2 });

    expect(userClient.send).toHaveBeenCalledTimes(1);
    expect(userClient.send).toHaveBeenCalledWith('user.findByIds', {
      ids: ['peer'],
    });
    expect(result.data).toEqual([
      expect.objectContaining({
        peer: expect.objectContaining({ id: 'peer' }),
      }),
      expect.objectContaining({
        peer: expect.objectContaining({ id: 'peer' }),
      }),
    ]);
  });

  it('returns group metadata without fetching participant profiles', async () => {
    participantsModel.aggregate.mockResolvedValue([
      {
        _id: new Types.ObjectId('68b000000000000000000003'),
        type: ConversationType.GROUPE,
        title: 'Backend Team',
        avatarUrl: 'group.jpg',
        updatedAt: new Date('2026-08-28T10:00:00.000Z'),
        participants: [{ userId: 'me' }, { userId: 'member' }],
      },
    ]);

    const result = await service.myConversations({ userId: 'me' });

    expect(userClient.send).not.toHaveBeenCalled();
    expect(result.data[0]).toEqual(
      expect.objectContaining({
        title: 'Backend Team',
        avatarUrl: 'group.jpg',
      }),
    );
  });

  it('uses limit plus one and returns a stable continuation cursor', async () => {
    const updatedAt = new Date('2026-08-28T10:00:00.000Z');
    participantsModel.aggregate.mockResolvedValue([
      {
        _id: new Types.ObjectId('68b000000000000000000004'),
        type: ConversationType.GROUPE,
        updatedAt,
        participants: [],
      },
      {
        _id: new Types.ObjectId('68b000000000000000000003'),
        type: ConversationType.GROUPE,
        updatedAt,
        participants: [],
      },
    ]);

    const firstPage = await service.myConversations({ userId: 'me', limit: 1 });
    expect(firstPage.data).toHaveLength(1);
    expect(firstPage.pagination).toEqual({
      hasMore: true,
      nextCursor: expect.any(String),
    });
    expect(participantsModel.aggregate.mock.calls[0][0]).toContainEqual({
      $sort: { updatedAt: -1, _id: -1 },
    });
    expect(participantsModel.aggregate.mock.calls[0][0]).toContainEqual({
      $limit: 2,
    });

    participantsModel.aggregate.mockResolvedValue([]);
    const secondPage = await service.myConversations({
      userId: 'me',
      limit: 1,
      cursor: firstPage.pagination.nextCursor!,
    });
    expect(secondPage).toEqual({
      data: [],
      pagination: { hasMore: false, nextCursor: null },
    });
    expect(participantsModel.aggregate.mock.calls[1][0]).toContainEqual({
      $match: {
        $or: [
          { updatedAt: { $lt: updatedAt } },
          {
            updatedAt,
            _id: { $lt: new Types.ObjectId('68b000000000000000000004') },
          },
        ],
      },
    });
  });

  it('keeps a missing peer profile from failing the page', async () => {
    participantsModel.aggregate.mockResolvedValue([
      {
        _id: new Types.ObjectId('68b000000000000000000005'),
        type: ConversationType.PRIVATE,
        updatedAt: new Date(),
        participants: [{ userId: 'me' }, { userId: 'missing' }],
      },
    ]);
    userClient.send.mockReturnValue(of([]));

    await expect(service.myConversations({ userId: 'me' })).resolves.toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            peer: expect.objectContaining({ id: 'missing' }),
          }),
        ],
      }),
    );
  });

  it('defines a serializable participants virtual', () => {
    const virtual = ConversationSchema.virtualpath('participants');

    expect(virtual).toBeDefined();
    expect(ConversationSchema.get('toJSON')).toEqual(
      expect.objectContaining({ virtuals: true }),
    );
    expect(ConversationSchema.get('toObject')).toEqual(
      expect.objectContaining({ virtuals: true }),
    );
  });

  it('persists a message for a participant before publishing it', async () => {
    const conversationId = '68b000000000000000000010';
    const participantId = new Types.ObjectId('68b000000000000000000011');
    const message = {
      _id: new Types.ObjectId('68b000000000000000000012'),
      participant: participantId,
      conversation: new Types.ObjectId(conversationId),
      content: 'hello',
      createdAt: new Date('2026-08-28T12:00:00.000Z'),
    };
    conversationModel.aggregate = jest
      .fn()
      .mockResolvedValue([{ participant: [{ _id: participantId }] }]);
    messageModel.create.mockResolvedValue(message);
    conversationEventsPublisher.messageSent.mockResolvedValue(undefined);

    await expect(
      service.sendMessage(conversationId, 'user-id', { content: 'hello' }),
    ).resolves.toBe(message);

    expect(conversationModel.aggregate).toHaveBeenCalledTimes(1);
    expect(messageModel.create).toHaveBeenCalledWith({
      participant: participantId,
      conversation: new Types.ObjectId(conversationId),
      content: 'hello',
      replyTo: undefined,
    });
    expect(conversationEventsPublisher.messageSent).toHaveBeenCalledWith({
      id: '68b000000000000000000012',
      conversationId,
      participantId: 'user-id',
      content: 'hello',
      replyTo: null,
      createdAt: message.createdAt,
    });
    expect(messageModel.create.mock.invocationCallOrder[0]).toBeLessThan(
      conversationEventsPublisher.messageSent.mock.invocationCallOrder[0],
    );
  });

  it('throws a typed not-found error when the conversation does not exist', async () => {
    conversationModel.aggregate = jest.fn().mockResolvedValue([]);

    await expect(
      service.sendMessage('68b000000000000000000010', 'user-id', {
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(ConversationNotFoundException);
    expect(messageModel.create).not.toHaveBeenCalled();
  });

  it('throws a typed forbidden error when the user is not a participant', async () => {
    conversationModel.aggregate = jest
      .fn()
      .mockResolvedValue([{ participant: [] }]);

    await expect(
      service.sendMessage('68b000000000000000000010', 'user-id', {
        content: 'hello',
      }),
    ).rejects.toBeInstanceOf(NotAConversationParticipantException);
    expect(messageModel.create).not.toHaveBeenCalled();
  });
});
