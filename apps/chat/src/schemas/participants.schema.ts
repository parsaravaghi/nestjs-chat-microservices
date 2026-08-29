import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Conversation } from './conversation.schema';
import { HydratedDocument, Types } from 'mongoose';
import { ParticipantRole } from '../enum/participantRole.enum';

export type ParticipantDocument = HydratedDocument<Participant>;

@Schema()
export class Participant {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Conversation' })
  conversationId: Conversation;

  @Prop({
    type: String,
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  role?: ParticipantRole;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

ParticipantSchema.index({ userId: 1, conversationId: 1 }, { unique: true });
