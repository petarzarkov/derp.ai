import { BaseProvider } from './base.provider';

export class GoogleProvider extends BaseProvider {
  prepareRequest(prompt: string) {
    return {
      url: `${this.config.url}/${this.model}:streamGenerateContent?key=${this.config.apiKey}&alt=sse`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: this.context }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    };
  }

  parseChunk(buffer: string): string {
    const lineRe = /^data: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
    let newlyProcessedText = '';
    let currentScanIndex = this.processedBufferIndex;

    while (currentScanIndex < buffer.length) {
      const remainingBuffer = buffer.substring(currentScanIndex);
      const match = remainingBuffer.match(lineRe);

      if (!match) {
        break;
      }

      const fullMatch = match[0];
      const jsonString = match[1];

      const data = JSON.parse(jsonString);

      if ('error' in data) {
        if (!data.error.message) {
          this.logger.error('Unknown provider error', { error: data.error });
        }
        throw new Error(data.error.message || 'Unknown provider error');
      }

      const chunk = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (chunk) {
        newlyProcessedText += chunk;
        this.emit('streamChunk', {
          model: this.model,
          provider: this.config.provider,
          nickname: this.nickname,
          queryId: this.queryId,
          text: chunk,
        });
      }

      currentScanIndex += fullMatch.length;
    }

    this.processedBufferIndex = currentScanIndex;

    return newlyProcessedText;
  }
}
