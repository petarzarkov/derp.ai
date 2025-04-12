import { Inject, Logger, UnauthorizedException, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, ServerOptions, Socket } from 'socket.io';
import { ChatMessage } from './chat.entity';
import { WebsocketsExceptionFilter } from './events.filter';
import { QnAService } from '../qna/qna.service';
import { AuthService } from '../auth/auth.service';
import { JWTPayload } from '../auth/auth.entity';

type ExtendedSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user: JWTPayload }>;

@WebSocketGateway<Partial<ServerOptions>>({
  cors: {
    origin: '*',
  },
  connectTimeout: 50000,
  pingInterval: 25000,
  pingTimeout: 5000,
})
@UseFilters(new WebsocketsExceptionFilter())
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  #botName = 'DerpAI';
  #logger = new Logger(this.constructor.name);

  @WebSocketServer()
  server: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user: JWTPayload }>;

  constructor(
    @Inject(QnAService)
    private readonly qnaService: QnAService,
    @Inject(AuthService)
    private readonly authService: AuthService,
  ) {}

  afterInit(server: typeof this.server) {
    server.use(async (socket, next) => {
      const header = socket.request.headers['authorization'];
      if (!header) {
        return next(new Error('no auth header'));
      }

      if (!header.startsWith('Bearer ')) {
        return next(new Error('invalid auth header'));
      }

      const token = header.split(' ')[1];
      if (!token) {
        return next(new Error('no token'));
      }

      try {
        socket.data.user = await this.authService.validateToken(token);
      } catch (error) {
        next(error as UnauthorizedException);
      }

      next();
    });
  }

  handleConnection(socket: ExtendedSocket) {
    const user = socket.data.user;
    this.#logger.log(`WSClient connected: ${socket.id}, user: ${user.sub}`);
    this.server.to(socket.id).emit('init', {
      message: `Hello! How may I help you?`,
      nickname: this.#botName,
      time: Date.now(),
    });
  }

  handleDisconnect(socket: ExtendedSocket) {
    const user = socket.data.user;
    this.#logger.log(`WSClient disconnected: ${socket.id}, user: ${user.sub}`);
    return this.server.emit('event', { disconnected: socket.id });
  }

  @SubscribeMessage('chat')
  @UsePipes(new ValidationPipe())
  handleMessage(@MessageBody() event: ChatMessage, @ConnectedSocket() socket: ExtendedSocket) {
    this.qnaService.getAnswer(event.message).then((answer) => {
      this.#logger.log(`Sending message ${answer.length} to WSClient: ${socket.id}`);
      this.server.to(socket.id).emit('chat', {
        message: answer,
        nickname: this.#botName,
        time: Date.now(),
      });
    });
  }
}
