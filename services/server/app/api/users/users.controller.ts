import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { SessionAuthGuard } from '../../modules/session/guards/session-auth.guard';
import { UsersService } from './users.service';
import { Request } from 'express';

@ApiTags('api', 'users')
@Controller({
  path: '/api/users',
})
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @UseGuards(SessionAuthGuard)
  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.', type: SanitizedUser })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMe(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(SessionAuthGuard)
  @Delete('/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete current logged-in user account' })
  @ApiResponse({ status: 204, description: 'User account deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteMe(@Req() req: Request): Promise<void> {
    if (!req.user) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.deleteUser(req.user.id);
  }
}
