import { Inject, Logger, UnauthorizedException, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { DefaultEventsMap, Server, Socket } from 'socket.io';
import { ChatMessage } from './chat.entity';
import { WebsocketsExceptionFilter } from './events.filter';
import { QnAService } from '../qna/qna.service';
import { AuthService } from '../auth/auth.service';
import { JWTPayload } from '../auth/auth.entity';
import { JwtService } from '@nestjs/jwt';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { parse as parseCookie } from 'cookie';

type ExtendedSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user: SanitizedUser }>;

@UseFilters(new WebsocketsExceptionFilter())
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  readonly #botName = 'DerpAI';
  readonly #logger = new Logger(this.constructor.name);

  @WebSocketServer()
  server: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, { user: SanitizedUser }>;

  constructor(
    @Inject(QnAService) private readonly qnaService: QnAService,
    @Inject(AuthService) private readonly authService: AuthService,
    @Inject(JwtService) private readonly jwtService: JwtService,
  ) {}

  async afterInit(server: typeof this.server) {
    server.use(async (socket: ExtendedSocket, next) => {
      const cookie = socket.handshake.headers?.cookie;
      if (!cookie) {
        this.#logger.warn(`WS Connection Rejected: Auth cookie missing (Socket ID: ${socket.id})`);
        return next(new WsException('Authentication cookie not provided.'));
      }

      try {
        const token = parseCookie(cookie)?.['access_token'];
        if (!token) {
          this.#logger.warn(`WS Connection Rejected: No access_token provided (Socket ID: ${socket.id})`);
          return next(new WsException('Authentication access_token not provided.'));
        }

        const payload = this.jwtService.verify<JWTPayload>(token);
        if (!payload || !payload.sub) {
          throw new WsException('Invalid token payload.');
        }

        const user = await this.authService.validateUserById(payload.sub);
        if (!user) {
          this.#logger.warn(
            `WS Connection Rejected: User not found for token sub ${payload.sub} (Socket ID: ${socket.id})`,
          );
          throw new WsException('User associated with token not found.');
        }

        socket.data.user = user;
        next();
      } catch (err) {
        const error = err as Error;
        this.#logger.error(`WS Authentication Error (Socket ID: ${socket.id}): ${error.message}`);
        if (error instanceof WsException || error instanceof UnauthorizedException) {
          next(error);
        } else if (error.name === 'JsonWebTokenError') {
          next(new WsException('Invalid authentication token.'));
        } else if (error.name === 'TokenExpiredError') {
          next(new WsException('Authentication token expired.'));
        } else {
          next(new WsException('Authentication failed.'));
        }
      }
    });
  }

  handleConnection(socket: ExtendedSocket) {
    const user = socket.data.user;
    this.#logger.log(`WSClient connected: ${socket.id}, UserID: ${user.id}, Email: ${user.email}`);

    this.server.to(socket.id).emit('init', {
      message: `Hello ${user.displayName || user.email}! How may I help you?`,
      nickname: this.#botName,
      time: Date.now(),
    });
  }

  handleDisconnect(socket: ExtendedSocket) {
    const userId = socket.data.user?.id || 'Unknown';
    this.#logger.log(`WSClient disconnected: ${socket.id}, UserID: ${userId}`);
  }

  @SubscribeMessage('chat')
  @UsePipes(new ValidationPipe())
  async handleMessage(@MessageBody() event: ChatMessage, @ConnectedSocket() socket: ExtendedSocket) {
    const user = socket.data.user;

    this.#logger.log(`Received message from ${user.email} (${socket.id}): ${event.message}`);

    try {
      const answer = await this.qnaService.getAnswer(event.message);
      this.#logger.log(`Sending answer (${answer.length} chars) to WSClient: ${socket.id}`);
      this.server.to(socket.id).emit('chat', {
        message: answer,
        nickname: this.#botName,
        time: Date.now(),
      });
    } catch (error) {
      this.#logger.error(`Error getting QnA answer for user ${user.email}:`, error);
      this.server.to(socket.id).emit('chat', {
        message: 'Sorry, I had trouble thinking about that.',
        nickname: this.#botName,
        time: Date.now(),
      });
    }
  }
}
