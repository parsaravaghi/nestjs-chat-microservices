export const getUserRoom = (userId: string): string => `user:${userId}`;

export const getConversationRoom = (conversationId: string): string =>
  `conversation:${conversationId}`;
