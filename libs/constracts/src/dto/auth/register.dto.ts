import {
  IsDefined,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsDefined({ message: 'username is required' })
  @IsString({ message: 'username must be a string' })
  @Matches(/^\S+$/, {
    message: 'username must not contain spaces',
  })
  @MaxLength(20, {
    message: 'username must not be longer than 20 characters',
  })
  username: string;

  @IsDefined({ message: 'password is required' })
  @IsString({ message: 'password must be a string' })
  @MinLength(8, {
    message: 'password must be at least 8 characters long',
  })
  @Matches(/^\S+$/, {
    message: 'password must not contain spaces',
  })
  password: string;

  @IsDefined({ message: 'email is required' })
  @IsString({ message: 'email must be a string' })
  @IsEmail(
    {},
    {
      message: 'email must be a valid email address',
    },
  )
  email: string;
}
