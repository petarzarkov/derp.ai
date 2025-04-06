import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../db/entities/users/user.entity';
import * as bcrypt from 'bcrypt';
import { LoginResponse } from './auth.entity';

@Injectable()
export class AuthService {
  logger = new Logger(this.constructor.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string) {
    try {
      const user = await this.userRepository.findOne({ where: { username } });
      if (user && (await bcrypt.compare(password, user.passwordHash))) {
        return user;
      }

      return null;
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }

  async login(user: Pick<User, 'id' | 'username'>): Promise<LoginResponse> {
    try {
      const payload = { username: user.username, sub: user.id };
      const token = this.jwtService.sign(payload);

      const updatedUser = {
        ...user,
        jwtToken: token,
      };

      await this.userRepository.save(updatedUser);

      return {
        accessToken: token,
      };
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }

  async validateToken(token: string): Promise<User> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user || user.jwtToken !== token) {
        throw new UnauthorizedException();
      }
      return user;
    } catch (error) {
      this.logger.error(error);
      throw new UnauthorizedException();
    }
  }
}
