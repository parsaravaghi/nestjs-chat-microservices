import { ConversationType } from '@app/constracts';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Participant } from './participants.schema';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({
    required: true,
    type: String,
  })
  created_by: string;

  @Prop({
    type: String,
    enum: ConversationType,
    default: ConversationType.PRIVATE,
    required: true,
  })
  type: ConversationType;

  @Prop({
    required: function (this: Conversation) {
      return this.type !== ConversationType.PRIVATE;
    },
  })
  title?: string;

  @Prop({
    type: String,
  })
  idempotencyKey?: string;

  @Prop()
  description?: string;

  @Prop()
  avatarUrl?: string;

  createdAt: Date;

  updatedAt: Date;

  participants?: Participant[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: ConversationType.PRIVATE,
      idempotencyKey: { $type: 'string' },
    },
  },
);

ConversationSchema.index({ updatedAt: -1, _id: -1 });
ConversationSchema.virtual('participants', {
  ref: Participant.name,
  localField: '_id',
  foreignField: 'conversationId',
});
ConversationSchema.set('toJSON', { virtuals: true });
ConversationSchema.set('toObject', { virtuals: true });
