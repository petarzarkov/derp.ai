import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';
import { ValidatedConfig } from '../../const';

@Injectable()
export class QnAService {
  #logger = new Logger(this.constructor.name);
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService<ValidatedConfig, true>) {
    const apiKey = this.configService.get('google.apiKey', { infer: true });
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set!');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async getAnswer(question: string): Promise<string> {
    if (!question?.trim()) {
      return 'Please ask a question!';
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

      // Basic prompt - can be greatly enhanced
      const prompt = `You are DerpAI, a helpful but sometimes silly chat assistant. Be concise. Answer the following question: ${question}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      this.#logger.log(`Q: "${question}", A: "${text}"`);
      return text;
    } catch (error) {
      this.#logger.error(`Error calling Generative AI API for "${question}":`, error);
      // Provide specific error handling based on API response if possible
      return 'Oops, I encountered an error while thinking about that.';
    }
  }
}
