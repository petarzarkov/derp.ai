import { Inject, Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai/ai.service';

@Injectable()
export class QnAService {
  #logger = new Logger(this.constructor.name);

  constructor(
    @Inject(AIService)
    private aiService: AIService,
  ) {}

  async getAnswer(question: string): Promise<string> {
    if (!question?.trim()) {
      return 'Please ask a question!';
    }

    try {
      const answer = await this.aiService.generateMultiProviderResponse(question);

      if (!answer) {
        this.#logger.warn(`No answer was generated for the question: ${question}`);
        return 'Oops, I am having trouble answering that right now.';
      }

      return answer;
    } catch (error) {
      this.#logger.error(`Error getting answer for "${question}":`, error);
      return 'Oops, I encountered an error while thinking about that.';
    }
  }
}
