import { ConversationType } from '../enum';

export const CHAT_CONVERSATION_CREATED_EVENT = 'chat.conversation.created';
export const WEBSOCKET_CONVERSATION_CREATED_EVENT = 'conversation.created';
export const CHAT_MESSAGE_SENT_EVENT = 'chat.message.send';
export const WEBSOCKET_MESSAGE_SENT_EVENT = 'newMessage';
export const API_GATEWAY_EVENTS_QUEUE = 'api_gateway_events_queue';

export interface ConversationResponse {
  id: string;
  createdBy: string;
  type: ConversationType;
  participantIds: string[];
  title?: string;
  description?: string;
}

export interface ConversationCreatedEvent {
  participantIds: string[];
  conversation: ConversationResponse;
}

export interface MessageSentEvent {
  id: string;
  conversationId: string;
  participantId: string;
  content: string;
  replyTo: string | null;
  createdAt: Date;
}
