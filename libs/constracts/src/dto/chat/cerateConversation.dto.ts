import { ConversationType } from '@app/constracts/enum';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isValidConversationTitle', async: false })
class IsValidConversationTitle implements ValidatorConstraintInterface {
  validate(title: unknown, { object }: ValidationArguments): boolean {
    const { type } = object as createConversationDto;

    if (type === ConversationType.PRIVATE) {
      return title === undefined;
    }

    return typeof title === 'string' && title.trim().length > 0;
  }

  defaultMessage({ object }: ValidationArguments): string {
    const { type } = object as createConversationDto;

    return type === ConversationType.PRIVATE
      ? 'title must not be defined for a private conversation'
      : 'title must be a non-empty string';
  }
}

export class createConversationDto {
  @IsEnum(ConversationType)
  type: ConversationType;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  participantIds: string[];

  @Validate(IsValidConversationTitle)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
