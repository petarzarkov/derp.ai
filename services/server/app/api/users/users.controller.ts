import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { SessionAuthGuard } from '../../modules/session/guards/session-auth.guard';
import { UsersService } from './users.service';
import { Request, Response } from 'express';
import { AuthService } from '../../modules/auth/auth.service';

@ApiTags('api', 'users')
@Controller({
  path: '/api/users',
})
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

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
  @ApiOperation({ summary: 'Delete current logged-in user account' })
  @ApiResponse({ status: 204, description: 'User account deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteMe(@Req() req: Request, @Res() res: Response): Promise<void> {
    if (!req.user) {
      throw new NotFoundException('User not found');
    }

    const refUserId = `${req.user.id}`;
    try {
      await this.authService.performLogout(req, res);
      await this.usersService.deleteUser(refUserId);
      res.status(HttpStatus.NO_CONTENT).send();
    } catch (error) {
      if (!res.headersSent) {
        const status =
          error instanceof NotFoundException || error instanceof InternalServerErrorException
            ? error.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;
        res.status(status).send({ message: error instanceof Error ? error.message : 'Failed to delete account.' });
      }
    }
  }
}
