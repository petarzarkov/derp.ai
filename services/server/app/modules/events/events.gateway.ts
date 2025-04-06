import { Inject, Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, ServerOptions, Socket } from 'socket.io';
import { ChatMessage } from './chat.entity';
import { WebsocketsExceptionFilter } from './events.filter';
import { QnAService } from '../qna/qna.service';

@WebSocketGateway<Partial<ServerOptions>>({
  cors: {
    origin: '*',
  },
  connectTimeout: 50000,
  pingInterval: 25000,
  pingTimeout: 5000,
})
@UseFilters(new WebsocketsExceptionFilter())
export class EventsGateway implements OnGatewayConnection {
  #botName = 'DerpAI';
  #logger = new Logger(this.constructor.name);

  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(QnAService)
    private readonly qnaService: QnAService,
  ) {}

  handleConnection(client: Socket) {
    this.#logger.log(`WSClient connected: ${client.id}`);
    this.server.to(client.id).emit('chat', {
      message: 'Connected! How may I help you?',
      nickname: this.#botName,
      time: Date.now(),
    });
  }

  @SubscribeMessage('chat')
  @UsePipes(new ValidationPipe())
  handleMessage(@MessageBody() event: ChatMessage, @ConnectedSocket() client: Socket) {
    this.qnaService.getAnswer(event.message).then((answer) => {
      this.#logger.log(`Sending message ${answer} to WSClient: ${client.id}`);
      this.server.to(client.id).emit('chat', {
        message: answer,
        nickname: this.#botName,
        time: Date.now(),
      });
    });
  }
}
