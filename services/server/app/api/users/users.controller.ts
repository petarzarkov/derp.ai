import { Controller, Get, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BaseRequest } from '../../modules/auth/auth.entity';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { SessionAuthGuard } from '../../modules/session/guards/session-auth.guard';

@ApiTags('api', 'users')
@Controller({
  path: '/api/users',
})
export class UsersController {
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
}
