import { UserEntity } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { UserDuplicateException } from './exceptions/userDuplicate.exception';
import { InternalServerException, UnknownDbException } from '@app/common';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {}

  async createOne(userData: UserEntity) {
    const newUser = this.userRepo.create(userData);

    try {
      return await this.userRepo.save(newUser);
    } catch (error) {
      this.handleError(error);
    }
  }

  handleError(error: any): never {
    if (error instanceof QueryFailedError) {
      const queryError = error as QueryFailedError & {
        errno: number;
      };

      if (queryError.errno === 1062) throw new UserDuplicateException();

      throw new UnknownDbException();
    }
    throw new InternalServerException();
  }
}
