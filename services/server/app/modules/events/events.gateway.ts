import { Inject, OnApplicationShutdown, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
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
import {
  ChatAnswersReply,
  ChatChunkReply,
  ChatEndReply,
  ChatErrorReply,
  ChatMessage,
  ChatMessageReply,
  StatusMessageReply,
} from './chat.entity';
import { WebsocketsExceptionFilter } from './events.filter';
import { SanitizedUser } from '../../db/entities/users/user.entity';
import { ContextLogger } from 'nestjs-context-logger';
import { runWithCtx } from 'nestjs-context-logger/dist/store/context-store';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';
import expressSession from 'express-session';
import { SessionStore } from '../session/session.store';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { NextFunction, Request, Response } from 'express';
import { AIService } from '../ai/ai.service';
import { RedisService } from '../redis/redis.service';
import { v4 as uuidv4 } from 'uuid';

interface EmitEvents {
  init: (message: ChatMessageReply) => void;
  chat: (message: ChatAnswersReply) => void;
  statusUpdate: (message: StatusMessageReply) => void;
  streamChunk: (message: ChatChunkReply) => void;
  streamEnd: (message: ChatEndReply) => void;
  streamError: (message: ChatErrorReply) => void;
}

export type EmitToClient = <K extends keyof EmitEvents>(ev: K, message: Parameters<EmitEvents[K]>[0]) => void;

type ExtendedSocket = Socket<DefaultEventsMap, EmitEvents, DefaultEventsMap, { user: SanitizedUser }>;

@UseFilters(new WebsocketsExceptionFilter())
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnApplicationShutdown {
  #botName;
  readonly #logger = new ContextLogger(this.constructor.name);
  readonly #sessionConfig: ValidatedConfig['auth']['session'];
  #validModels;

  @WebSocketServer()
  server: Server<DefaultEventsMap, EmitEvents, DefaultEventsMap, { user: SanitizedUser }>;

  constructor(
    readonly configService: ConfigService<ValidatedConfig, true>,
    @Inject(SessionStore) private readonly sessionStore: SessionStore,
    @Inject(AIService) private readonly aiService: AIService,
    private readonly redisService: RedisService,
  ) {
    this.#sessionConfig = this.configService.get('auth.session', { infer: true });
    const appConfig = this.configService.get('app', { infer: true });
    this.#botName = appConfig.name;
    this.#validModels = Object.keys(this.configService.get('aiProviders', { infer: true }));
  }

  wrapMiddlewareForSocketIo =
    (middleware: (request: Request, response: Response, next: NextFunction) => void) =>
    (socket: Socket, next: (err?: Error) => void) => {
      middleware(socket.request as Request, {} as Response, next as NextFunction);
    };

  async afterInit(server: typeof this.server) {
    this.#logger.log('WebSocket server initialized.', { options: server._opts });

    server.use(this.wrapMiddlewareForSocketIo(cookieParser(this.#sessionConfig.secret)));
    server.use(
      this.wrapMiddlewareForSocketIo(
        expressSession({
          store: this.sessionStore,
          secret: this.#sessionConfig.secret,
          resave: false,
          saveUninitialized: false,
          name: this.#sessionConfig.cookieName,
          cookie: this.#sessionConfig.cookie,
        }),
      ),
    );
    server.use(this.wrapMiddlewareForSocketIo(passport.initialize()));
    server.use(this.wrapMiddlewareForSocketIo(passport.session()));
    server.use((socket: ExtendedSocket, next) => {
      const request = socket.request as Request;
      if (request.user && request.isAuthenticated && request.isAuthenticated()) {
        socket.data.user = request.user;
        this.#logger.debug(`WS Authenticated via session: ${socket.data.user.email} (Socket ID: ${socket.id})`);
        next();
      } else {
        this.#logger.warn(`WS Connection Rejected: Unauthorized session (Socket ID: ${socket.id})`);
        next(new WsException('Unauthorized: Invalid session or user not found.'));
      }
    });

    server.use((socket: ExtendedSocket, next) => {
      const request = socket.request as Request;
      runWithCtx(async () => next(), {
        socket: {
          id: socket.id,
        },
        user: socket.data.user,
        session: {
          id: request.sessionID,
          cookieExpires: request.session.cookie.expires,
        },
        flow: 'WebSocket',
      });
    });
  }

  handleConnection(socket: ExtendedSocket) {
    const user = socket.data.user;
    this.#logger.log(`WSClient connected`);

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

  @SubscribeMessage('chat-stream')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleMessageStream(@MessageBody() event: ChatMessage, @ConnectedSocket() socket: ExtendedSocket) {
    const user = socket.data.user;
    const queryId = event.queryId || uuidv4();

    this.#logger.log(
      `Received v2 prompt from ${user.email} (${socket.id}) - ${queryId}: ${`${event.prompt}`.slice(0, 50)}...`,
      { queryId },
    );
    if (event.models.some((model) => !this.#validModels.includes(model))) {
      throw new WsException('Invalid models received.');
    }

    try {
      const aiAnswers = await this.aiService.streamMultiProviderResponse(
        queryId,
        event.prompt,
        event.models,
        (ev, data) => {
          // @ts-expect-error type validation of socket io is weird
          this.server.to(socket.id).emit(ev, data);
        },
      );

      void this.redisService.addMessageToHistory(
        user.id,
        {
          ...event,
          queryId,
        },
        {
          answers: aiAnswers,
          nickname: this.#botName,
          time: Date.now(),
        },
      );
    } catch (error) {
      this.#logger.error(
        `Error processing chat message for user ${user.email} (${socket.id}) - ${queryId}:`,
        error as Error,
      );

      event.models.forEach((model) => {
        this.server.to(socket.id).emit('streamError', {
          queryId,
          model,
          error: `An unexpected backend error occurred`,
          nickname: this.#botName,
          time: Date.now(),
        });
        this.server.to(socket.id).emit('streamEnd', {
          queryId,
          model,
          nickname: this.#botName,
          time: Date.now(),
        });
      });
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.#logger.debug(`WebSocket server received shutdown signal: ${signal}`);

    await this.server.close((err) => {
      if (err) {
        this.#logger.error('Error closing WebSocket server:', err);
      } else {
        this.#logger.log('WebSocket server closed.');
      }
    });
  }
}
