import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Conversation } from './conversation.schema';
import { Participant } from './participants.schema';

export type MessageDocument = HydratedDocument<Message>;

@Schema({ timestamps: true })
export class Message {
  @Prop({ required: true, type: Types.ObjectId, ref: Participant.name })
  participant: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ required: true, type: Types.ObjectId, ref: Conversation.name })
  conversation: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Message.name })
  replyTo?: Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

MessageSchema.index({ conversation: 1, createdAt: -1 });
