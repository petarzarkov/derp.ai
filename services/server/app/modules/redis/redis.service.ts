import { Injectable } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ContextLogger } from 'nestjs-context-logger';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';
import { ChatHistoryItem, ChatMessage, ChatMessageReply } from '../events/chat.entity';

@Injectable()
export class RedisService {
  readonly #logger = new ContextLogger(RedisService.name);
  #maxChatMessageHistory: number;
  redisClient: RedisClientType;

  constructor(private readonly configService: ConfigService<ValidatedConfig, true>) {
    const redisConfig = this.configService.get('redis', { infer: true });
    this.#maxChatMessageHistory = redisConfig.maxChatMessageHistory;

    const client: RedisClientType = createClient({
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries: number, cause: Error) => {
          this.#logger.warn(`Redis reconnect attempt ${retries}... Cause: ${cause.message}`);
          return Math.min(retries * 100, 5000);
        },
        tls: redisConfig.tls,
      },
      password: redisConfig.password,
    });

    client.on('connect', () =>
      this.#logger.log(`Attempting to connect to Redis at ${redisConfig.host}:${redisConfig.port}...`),
    );
    client.on('ready', () => this.#logger.log('Redis client ready (connected).'));
    client.on('reconnecting', () => this.#logger.debug('Redis client reconnecting...'));
    client.on('error', (err) => this.#logger.error('Redis Client Error', err));
    client.on('end', () => this.#logger.log('Redis client connection ended.'));

    this.redisClient = client;
  }

  private getHistoryListKey(userId: string): string {
    return `chat-history:${userId}`;
  }

  async addMessageToHistory(userId: string, question: ChatMessage, answer: ChatMessageReply): Promise<void> {
    const listKey = this.getHistoryListKey(userId);
    const historyEntry: ChatHistoryItem = {
      question,
      answer,
    };
    const historyEntryString = JSON.stringify(historyEntry);

    try {
      // RPUSH adds the new entry to the end (right) of the list
      await this.redisClient.rPush(listKey, historyEntryString);
      // LTRIM keeps only the LAST N elements (indices from -N to -1)
      await this.redisClient.lTrim(listKey, -this.#maxChatMessageHistory, -1);
      this.#logger.debug(`Added message to history for user ${userId}, list trimmed.`);
    } catch (error) {
      this.#logger.error(`Failed to add message to Redis history for user ${userId}`, { error });
    }
  }

  async getUserChatHistory(userId: string): Promise<ChatHistoryItem[]> {
    const listKey = this.getHistoryListKey(userId);
    try {
      const historyJsonStrings = await this.redisClient.lRange(listKey, 0, -1);

      return historyJsonStrings
        .map((entry) => {
          try {
            return JSON.parse(entry) as ChatHistoryItem;
          } catch (err) {
            this.#logger.warn(`Failed to parse history entry for user ${userId}: ${entry}`, { err });
            return null;
          }
        })
        .filter((item): item is ChatHistoryItem => item !== null);
    } catch (error) {
      this.#logger.error(`Failed to retrieve chat history from Redis for user ${userId}`, error as Error);
    }

    return [];
  }

  async deleteUserChatHistory(userId: string): Promise<void> {
    const listKey = this.getHistoryListKey(userId);
    try {
      const deletedCount = await this.redisClient.del(listKey);
      this.#logger.log(`Deleted chat history for user ${userId}. Keys deleted: ${deletedCount}`);
    } catch (error) {
      this.#logger.error(`Failed to delete chat history for user ${userId}`, error as Error);
    }
  }
}
