import { ArgumentsHost, BadRequestException, Catch, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { ContextLogger } from 'nestjs-context-logger';
import { ExtendedSocket } from './events.gateway';

@Catch()
export class WebsocketsExceptionFilter implements WsExceptionFilter {
  logger = new ContextLogger(WebsocketsExceptionFilter.name);

  catch(exception: WsException, host: ArgumentsHost) {
    const socket = host.switchToWs().getClient<ExtendedSocket>();
    this.logger.warn('WS Exception', exception);

    const message = exception instanceof BadRequestException ? exception.getResponse()?.toString() : exception.message;
    socket.emit('exception', {
      status: 'error',
      message,
    });
  }
}
