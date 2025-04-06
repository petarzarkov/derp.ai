import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { ConnectedSocket, MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, ServerOptions, Socket } from 'socket.io';
import { ChatMessage } from './chat.entity';
import { WebsocketsExceptionFilter } from './events.filter';

@WebSocketGateway<Partial<ServerOptions>>({
  cors: {
    origin: '*',
  },
  connectTimeout: 50000,
  pingInterval: 25000,
  pingTimeout: 5000,
})
@UseFilters(new WebsocketsExceptionFilter())
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('chat')
  @UsePipes(new ValidationPipe())
  handleMessage(@MessageBody() event: ChatMessage, @ConnectedSocket() client: Socket) {
    this.server.to(client.id).emit('chat', {
      message: `you sent me: ${event.message}`,
      nickname: 'bot',
      time: Date.now(),
    });
  }
}
