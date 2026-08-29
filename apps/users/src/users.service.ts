import { UserEntity } from '@app/database';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
  ) {}

  async createOne(userData: UserEntity) {
    const newUser = this.userRepo.create({
      ...userData,
      password: await bcrypt.hash(userData.password, 12),
    });

    return this.userRepo.save(newUser);
  }

  async findOneBy(
    where: FindOptionsWhere<UserEntity>,
  ): Promise<UserEntity | null> {
    return this.userRepo.findOneBy(where);
  }

  async findBy(
    where: FindOptionsWhere<UserEntity> | FindOptionsWhere<UserEntity>[],
  ): Promise<UserEntity[]> {
    return this.userRepo.find({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIds(ids: string[]): Promise<UserEntity[]> {
    return this.userRepo.find({
      where: { id: In(ids) },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }
}
