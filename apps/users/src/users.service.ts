import { UserEntity } from '@app/database';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

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
      if (error instanceof QueryFailedError) {
        const queryError = error as QueryFailedError & {
          errno: number;
        };

        if (queryError.errno === 1062) throw new NotAcceptableException();

        throw new BadRequestException();
      }
      throw new InternalServerErrorException();
    }
  }
}
