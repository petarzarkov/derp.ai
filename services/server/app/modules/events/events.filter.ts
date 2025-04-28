import { ArgumentsHost, BadRequestException, Catch, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ContextLogger } from 'nestjs-context-logger';
import { Socket } from 'socket.io';

@Catch()
export class WebsocketsExceptionFilter implements WsExceptionFilter {
  logger = new ContextLogger(WebsocketsExceptionFilter.name);

  catch(exception: WsException, host: ArgumentsHost) {
    const socket = host.switchToWs().getClient<Socket>();
    this.logger.warn('WS Exception', exception);

    const message = exception instanceof BadRequestException ? exception.getResponse() : exception.message;
    socket.emit('exception', {
      status: 'error',
      message,
    });
  }
}
