import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllMiddlewareArgs, App, AppOptions, LogLevel, SayArguments } from '@slack/bolt';
import { v4 } from 'uuid';
import { AppContext } from './entities/slack.types';
import { ValidatedConfig } from '../../const';
import { SlackLogger } from './slack.logger';
import { Bindings } from 'pino';
import { Cron } from '@nestjs/schedule';

function* chunks<T>(arr: T[], n: number): Generator<T[], void> {
  for (let i = 0; i < arr.length; i += n) {
    yield arr.slice(i, i + n);
  }
}

@Injectable()
export class SlackService<CustomContext extends AppContext = AppContext> {
  logQueue: {
    color: 'good' | 'warning' | 'danger' | 'fatal';
    message: string;
    bindings: Bindings;
  }[] = [];
  #app: App<CustomContext>;
  #logger: SlackLogger;
  #defaultChannel?: string;
  botName: string;
  actions = {
    openBrowser: 'open_in_browser',
    botAdd: 'bot_add_to_new_channel',
  };

  constructor(private readonly configService: ConfigService<ValidatedConfig, true>) {
    this.logQueue = [];
    const slackConfig = this.configService.get('slack', { infer: true });
    const logConfig = this.configService.get('log', { infer: true });
    this.#logger = new SlackLogger(this.constructor.name, logConfig.level as LogLevel);
    const options: AppOptions = {
      logLevel: LogLevel.INFO,
      logger: this.#logger,
      token: slackConfig.botToken,
      signingSecret: slackConfig.signingSecret,
      appToken: slackConfig.appToken,
      socketMode: slackConfig.socketMode ? slackConfig.socketMode : true,
    };
    this.#defaultChannel = slackConfig.defaultChannel;
    this.botName = slackConfig.botName;
    this.#app = new App(options);

    async function enrichCtx({ context, next }: AllMiddlewareArgs<CustomContext>) {
      const requestId = v4();
      context['requestId'] = requestId;
      context.userToken = slackConfig.userToken;

      return await next();
    }

    this.#app.use(enrichCtx);
  }

  healthcheck = () => this.#app.client.auth.test();

  get app() {
    return this.#app;
  }

  get client() {
    return this.#app.client;
  }

  post(opts: SayArguments) {
    const channel = opts.channel || this.#defaultChannel;
    if (!channel) {
      this.#logger.warn('Channel needs to be specified');
      return;
    }

    return this.client?.chat.postMessage({
      ...opts,
      channel,
    });
  }

  postContext(params: Parameters<typeof this.buildContext>[0]) {
    return this.post(this.buildContext(params));
  }

  buildContext = <Data = Record<string, unknown>>({
    data,
    username,
    header,
    buttons,
    color = 'good',
  }: {
    username?: string;
    header: string;
    data: Data;
    buttons?: {
      block_id?: string;
      action_id?: string;
      items: { text: string; url?: string; style?: 'danger' | 'primary' }[];
    };
    color?: string;
  }): SayArguments => {
    const payloadClean = this.cleanUpNullables(data || {});

    const model: SayArguments = {
      username,
      reply_broadcast: false,
      attachments: [
        {
          color: color,
          fallback: header,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: header,
              },
            },
            {
              type: 'divider',
            },
            payloadClean && {
              type: 'context',
              elements: this.buildContextElements(payloadClean),
            },
            {
              type: 'divider',
            },
            buttons
              ? {
                  type: 'actions',
                  block_id: buttons.block_id || `block_${this.actions.openBrowser}`,
                  elements: buttons.items.map((button, index) => ({
                    type: 'button',
                    action_id: `${this.actions.openBrowser}_${index}`,
                    ...(button.style && { style: button.style }),
                    text: {
                      type: 'plain_text',
                      emoji: true,
                      text: button.text,
                    },
                    ...(button.url && { url: button.url }),
                  })),
                }
              : {
                  type: 'divider',
                },
          ],
        },
      ],
    };

    return model;
  };

  buildContextElements = (payload: Record<string, unknown>) => {
    try {
      return (
        Object.keys(payload)
          .map(
            (key) =>
              ({
                type: 'mrkdwn',
                text: `*${key}:* ${
                  typeof payload[key] === 'string'
                    ? payload[key]
                    : JSON.stringify(payload[key], this.getCircularReplacer())
                }`,
              }) as const,
          )
          // Max attachments size in slack API
          .slice(0, 10)
      );
    } catch (error) {
      return [
        {
          type: 'mrkdwn',
          text: (error as Error).toString(),
        } as const,
      ];
    }
  };

  getCircularReplacer = () => {
    const seen = new WeakSet();
    return (_key: string, value: object | null) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return;
        }
        seen.add(value);
      }
      return value;
    };
  };

  buildImage = ({
    title,
    url,
    altText,
    icon_url,
    username,
  }: {
    username?: string;
    icon_url?: string;
    title: string;
    url: string;
    altText?: string;
  }): SayArguments => ({
    username,
    icon_url,
    reply_broadcast: false,
    text: 'No image for you.',
    blocks: [
      {
        type: 'image',
        title: {
          type: 'plain_text',
          text: title,
        },
        block_id: `img_${title}`,
        image_url: url,
        alt_text: altText || `An incredibly cute ${title}.`,
      },
    ],
  });

  cleanUpNullables<Nullable extends Record<PropertyKey, unknown>>(obj: Nullable): NonNullable<Partial<Nullable>> {
    Object.keys(obj).map((item) => {
      if (
        ['null', 'undefined', 'NaN', null, undefined, NaN].includes(obj[item] as string | number | null | undefined)
      ) {
        delete obj[item];
      }
    });

    return obj;
  }

  queueLog(color: 'good' | 'warning' | 'danger' | 'fatal', message: string, bindings: Bindings) {
    this.logQueue.push({
      color,
      message,
      bindings,
    });
  }

  @Cron('*/15 * * * * *', {
    waitForCompletion: true,
  })
  async sendLogQueue() {
    const logsToSend = this.logQueue;
    if (!logsToSend.length) {
      return;
    }
    this.logQueue = [];

    const chunked = [...chunks(logsToSend, 10)];

    for (const chunk of chunked) {
      const text = `DerpAI logs chunk ${new Date().toISOString()}`;
      await this.post({
        channel: 'derp-ai-logs',
        text,
        unfurl_media: false,
        unfurl_links: false,
        blocks: chunk.map(({ color, message, bindings }) => ({
          type: 'context',
          elements: [
            {
              type: 'plain_text',
              text: `${this.getEmojiFromColor(color)} ${message}`,
            },
            {
              type: 'mrkdwn',
              text: `\`\`\`${JSON.stringify(bindings, this.getCircularReplacer(), 2)}\`\`\``,
            },
          ],
        })),
      });
    }

    this.logQueue = [];
  }

  getEmojiFromColor(color: 'good' | 'warning' | 'danger' | 'fatal') {
    switch (color) {
      case 'good':
        return ':zap:';
      case 'warning':
        return ':warning:';
      case 'danger':
        return ':x:';
      case 'fatal':
        return ':boom:';
      default:
        return ':zap:';
    }
  }
}
