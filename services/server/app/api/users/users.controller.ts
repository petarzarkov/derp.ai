import { Controller, Delete, Get, HttpCode, HttpStatus, Inject, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseRequest } from '../../modules/auth/auth.entity';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { SessionAuthGuard } from '../../modules/session/guards/session-auth.guard';
import { UsersService } from './users.service';

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
  async getMe(@Req() req: BaseRequest) {
    return req.user;
  }

  @UseGuards(SessionAuthGuard)
  @Delete('/me')
  @HttpCode(HttpStatus.NO_CONTENT) // 204 No Content is typical for successful DELETE
  @ApiOperation({ summary: 'Delete current logged-in user account' })
  @ApiResponse({ status: 204, description: 'User account deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' }) // If deletion fails
  async deleteMe(@Req() req: BaseRequest): Promise<void> {
    await this.usersService.deleteUser(req.user.id);
    req.session.destroy((err) => {
      if (err) {
        console.error('Failed to destroy session after user deletion:', err);
      }
    });
  }
}
