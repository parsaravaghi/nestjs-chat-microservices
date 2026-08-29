import { SendMessageDto } from '@app/constracts';
import { IsMongoId } from 'class-validator';

export class SendMessageWsDto extends SendMessageDto {
  @IsMongoId()
  conversationId: string;
}
