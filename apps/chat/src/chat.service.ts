import {
  ConversationCreatedEvent,
  ConversationListResponseDto,
  ConversationType,
  SendMessageDto,
} from '@app/constracts';
import { createConversationDto } from '@app/constracts/dto/chat/cerateConversation.dto';
import { UserEntity } from '@app/database';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { firstValueFrom } from 'rxjs';
import { withTransaction } from './utils/mongoTransaction.util';
import { Conversation } from './schemas/conversation.schema';
import { Participant } from './schemas/participants.schema';
import { ParticipantRole } from './enum/participantRole.enum';
import { ChatEventsPublisher } from './chatEvents.publisher';
import { Message, MessageDocument } from './schemas/message.schema';
import {
  ConversationNotFoundException,
  NotAConversationParticipantException,
} from './exceptions';

@Injectable()
export class ChatService {
  constructor(
    @Inject('USER_SERVICE') private readonly userClientProxy: ClientProxy,
    @InjectConnection() private readonly connection: Connection,

    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,

    @InjectModel(Participant.name)
    private readonly participantsModel: Model<Participant>,

    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,

    private readonly chatEventsPublisher: ChatEventsPublisher,
  ) {}

  async createConversation(args: {
    dto: createConversationDto;
    userId: string;
  }): Promise<Participant[]> {
    const participantIds = [
      ...new Set([args.userId, ...args.dto.participantIds]),
    ];

    if (
      args.dto.type === ConversationType.PRIVATE &&
      participantIds.length !== 2
    ) {
      throw new ConflictException(
        'One or more conversation participant IDs are invalid',
      );
    }

    const users = await this.findUsersByIds(participantIds);
    const foundUserIds = new Set(users.map(({ id }) => id));

    if (participantIds.some((id) => !foundUserIds.has(id))) {
      throw new ConflictException(
        'One or more conversation participant IDs are invalid',
      );
    }

    const idempotencyKey =
      args.dto.type === ConversationType.PRIVATE
        ? [...participantIds].sort().join(':')
        : undefined;

    const session = await this.connection.startSession();

    const result = await withTransaction(session, async () => {
      const [conversation] = await this.conversationModel.create(
        [
          {
            created_by: args.userId,
            type: args.dto.type,
            title: args.dto.title ?? undefined,
            description: args.dto.description,
            idempotencyKey,
          },
        ],
        { session },
      );

      const participants = participantIds.map((participantId) => ({
        conversationId: conversation._id,
        userId: participantId,
        role:
          participantId === args.userId
            ? ParticipantRole.OWNER
            : ParticipantRole.MEMBER,
      }));

      const persistedParticipants = await this.participantsModel.insertMany(
        participants,
        { session },
      );

      return { conversation, participants: persistedParticipants };
    });

    const event: ConversationCreatedEvent = {
      participantIds,
      conversation: {
        id: result.conversation._id.toString(),
        createdBy: result.conversation.created_by,
        type: result.conversation.type,
        participantIds,
        title: result.conversation.title,
        description: result.conversation.description,
      },
    };

    await this.chatEventsPublisher.conversationCreated(event);

    return result.participants;
  }

  async myConversationIds(userId: string): Promise<string[]> {
    const participantEntries = await this.participantsModel
      .find({ userId })
      .select('conversationId')
      .lean()
      .exec();

    return participantEntries.map((p) => p.conversationId.toString());
  }

  async myConversations(args: {
    userId: string;
    cursor?: string;
    limit?: number;
  }): Promise<ConversationListResponseDto> {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const cursor = args.cursor ? this.decodeCursor(args.cursor) : undefined;
    const conversationCollection = this.conversationModel.collection.name;

    const cursorMatch = cursor
      ? {
          $or: [
            { updatedAt: { $lt: cursor.updatedAt } },
            { updatedAt: cursor.updatedAt, _id: { $lt: cursor.id } },
          ],
        }
      : {};

    const conversations = await this.participantsModel.aggregate<{
      _id: Types.ObjectId;
      type: ConversationType;
      title?: string;
      avatarUrl?: string;
      updatedAt: Date;
      participants: Array<{ userId: string }>;
    }>([
      { $match: { userId: args.userId } },
      {
        $lookup: {
          from: conversationCollection,
          localField: 'conversationId',
          foreignField: '_id',
          as: 'conversation',
        },
      },
      { $unwind: '$conversation' },
      { $replaceRoot: { newRoot: '$conversation' } },
      { $match: cursorMatch },
      { $sort: { updatedAt: -1, _id: -1 } },
      { $limit: limit + 1 },
      {
        $lookup: {
          from: this.participantsModel.collection.name,
          localField: '_id',
          foreignField: 'conversationId',
          as: 'participants',
        },
      },
    ]);

    const hasMore = conversations.length > limit;
    const page = conversations.slice(0, limit);
    const peerIds = [
      ...new Set(
        page
          .filter(({ type }) => type === ConversationType.PRIVATE)
          .map(({ participants }) =>
            participants.find(({ userId }) => userId !== args.userId),
          )
          .filter((participant) => participant !== undefined)
          .map(({ userId }) => userId),
      ),
    ];
    const users = peerIds.length ? await this.findUsersByIds(peerIds) : [];
    const usersById = new Map(users.map((user) => [user.id, user]));

    const data = page.map((conversation) => {
      if (conversation.type === ConversationType.PRIVATE) {
        const peerId = conversation.participants.find(
          ({ userId }) => userId !== args.userId,
        )?.userId;
        const peer = peerId ? usersById.get(peerId) : undefined;

        return {
          id: conversation._id.toString(),
          type: ConversationType.PRIVATE,
          peer: peerId
            ? {
                id: peerId,
                username: peer?.username,
              }
            : null,
          updatedAt: conversation.updatedAt,
        };
      }

      return {
        id: conversation._id.toString(),
        type: conversation.type,
        title: conversation.title,
        avatarUrl: conversation.avatarUrl,
        updatedAt: conversation.updatedAt,
      };
    });
    const last = page.at(-1);

    return {
      data,
      pagination: {
        hasMore,
        nextCursor:
          hasMore && last ? this.encodeCursor(last.updatedAt, last._id) : null,
      },
    };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendMessageDto,
    options: { publishEvent?: boolean } = {},
  ): Promise<MessageDocument> {
    if (!Types.ObjectId.isValid(conversationId)) {
      throw new ConversationNotFoundException();
    }

    const conversationObjectId = new Types.ObjectId(conversationId);

    // One aggregation proves conversation existence and returns only this
    // user's participant id, avoiding separate conversation/membership reads.
    const [membership] = await this.conversationModel.aggregate<{
      participant: Array<{ _id: Types.ObjectId }>;
    }>([
      { $match: { _id: conversationObjectId } },
      {
        $lookup: {
          from: this.participantsModel.collection.name,
          let: { conversationId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$conversationId', '$$conversationId'] },
                    { $eq: ['$userId', userId] },
                  ],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: 'participant',
        },
      },
      { $project: { participant: 1 } },
    ]);

    if (!membership) {
      throw new ConversationNotFoundException();
    }

    const participantId = membership.participant[0]?._id;
    if (!participantId) {
      throw new NotAConversationParticipantException();
    }

    const message = await this.messageModel.create({
      participant: participantId,
      conversation: conversationObjectId,
      content: dto.content,
      replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : undefined,
    });

    if (options.publishEvent !== false) {
      await this.chatEventsPublisher.messageSent({
        id: message._id.toString(),
        conversationId,
        participantId: userId,
        content: message.content,
        replyTo: message.replyTo?.toString() ?? null,
        createdAt: message.createdAt,
      });
    }

    return message;
  }

  private encodeCursor(updatedAt: Date, id: Types.ObjectId): string {
    return Buffer.from(
      JSON.stringify({ updatedAt: updatedAt.toISOString(), id: id.toString() }),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): {
    updatedAt: Date;
    id: Types.ObjectId;
  } {
    try {
      const parsed = JSON.parse(
        Buffer.from(cursor, 'base64url').toString(),
      ) as {
        updatedAt?: unknown;
        id?: unknown;
      };
      const updatedAt = new Date(String(parsed.updatedAt));

      if (
        Number.isNaN(updatedAt.getTime()) ||
        typeof parsed.id !== 'string' ||
        !Types.ObjectId.isValid(parsed.id)
      ) {
        throw new Error('Invalid cursor values');
      }

      return { updatedAt, id: new Types.ObjectId(parsed.id) };
    } catch {
      throw new BadRequestException('Invalid conversation cursor');
    }
  }

  private async findUsersByIds(ids: string[]): Promise<UserEntity[]> {
    return firstValueFrom(
      this.userClientProxy.send<UserEntity[]>('user.findByIds', { ids }),
    );
  }
}
