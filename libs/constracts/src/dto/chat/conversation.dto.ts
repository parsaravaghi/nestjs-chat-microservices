import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ConversationType } from '../../enum';

export class ConversationPaginationQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export interface ConversationPeerDto {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface PrivateConversationResponseDto {
  id: string;
  type: ConversationType.PRIVATE;
  peer: ConversationPeerDto | null;
  updatedAt: Date;
}

export interface GroupConversationResponseDto {
  id: string;
  type: Exclude<ConversationType, ConversationType.PRIVATE>;
  title?: string;
  avatarUrl?: string;
  updatedAt: Date;
}

export type ConversationListItemDto =
  PrivateConversationResponseDto | GroupConversationResponseDto;

export interface ConversationPaginationDto {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConversationListResponseDto {
  data: ConversationListItemDto[];
  pagination: ConversationPaginationDto;
}
