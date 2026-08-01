import { UserEntity } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, QueryFailedError, Repository } from 'typeorm';
import { UserDuplicateException } from './exceptions/userDuplicate.exception';
import { InternalServerException, UnknownDbException } from '@app/common';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    // Inject the TypeORM repository for UserEntity.
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {}

  async createOne(userData: UserEntity) {
    const newUser = this.userRepo.create({
      ...userData,
      password: (await bcrypt.hash(userData.password, 12)) as string,
    });

    try {
      return await this.userRepo.save(newUser);
    } catch (error) {
      // Convert database errors into application-specific exceptions.
      this.handleError(error);
    }
  }

  async findOneBy(
    userData: FindOptionsWhere<UserEntity>,
  ): Promise<UserEntity | null> {
    return this.userRepo.findOneBy(userData);
  }

  handleError(error: any): never {
    if (error instanceof QueryFailedError) {
      // MySQL-specific error information.
      const queryError = error as QueryFailedError & {
        errno: number;
      };

      // MySQL error 1062 indicates a duplicate unique key violation.
      if (queryError.errno === 1062) throw new UserDuplicateException();

      throw new UnknownDbException();
    }

    throw new InternalServerException();
  }
}
