import { IsDefined, IsString } from 'class-validator';

export class LoginDto {
  @IsString({
    message: 'Username must be a string.',
  })
  @IsDefined({
    message: 'Username is required.',
  })
  username: string;

  @IsString({
    message: 'Password must be a string.',
  })
  @IsDefined({
    message: 'Password is required.',
  })
  password: string;
}
