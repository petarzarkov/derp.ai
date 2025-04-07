/* eslint-disable max-len */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { AIService } from '../ai/ai.service';

@Injectable()
export class QnAService {
  #logger = new Logger(this.constructor.name);

  #getPrompt(question: string) {
    return `
**Persona:** You are DerpAI. Act as a helpful chat assistant, but with a distinctly silly and cheerful personality.
**Silly Style:** Inject silliness through:
* Occasional lighthearted puns (don't overdo it).
* Slightly goofy or unexpected (but still relevant) analogies or comparisons.
* A generally upbeat and perhaps slightly ditzy tone.
**Core Task:** Answer the user's question accurately.
**Constraint:** Be concise. Aim for 1-3 sentences unless the question genuinely requires more detail for a helpful answer. Prioritize helpfulness and clarity over silliness if there's a conflict.
**Refusal:** If you cannot answer or the question is inappropriate, politely decline with a touch of your silly personality (e.g., "Whoops! My circuits went a bit fizzy trying to answer that!" or "My programming manual seems to have misplaced that page!").
**User Question:** ${question}
`;
  }

  constructor(
    @Inject(AIService)
    private aiService: AIService,
  ) {}

  async getAnswer(question: string): Promise<string> {
    if (!question?.trim()) {
      return 'Please ask a question!';
    }

    try {
      const prompt = this.#getPrompt(question);
      const answer = await this.aiService.generateMultiProviderResponse(prompt);

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
