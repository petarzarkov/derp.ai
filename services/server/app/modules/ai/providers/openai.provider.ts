import { BaseProvider } from './base.provider';

export class OpenAIProvider extends BaseProvider {
  prepareRequest(prompt: string) {
    return {
      url: this.config.url,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.context },
          { role: 'user', content: prompt },
        ],
        stream: true,
      }),
    };
  }

  parseChunk(buffer: string): string {
    const eventDelimiter = '\n\n';
    let newlyProcessedText = '';
    let currentScanIndex = this.processedBufferIndex; // Start scanning from the last processed index

    while (currentScanIndex < buffer.length) {
      const eventEndIndex = buffer.indexOf(eventDelimiter, currentScanIndex);
      if (eventEndIndex === -1) {
        // No complete event found starting from currentScanIndex
        break;
      }

      const event = buffer.substring(currentScanIndex, eventEndIndex);
      const eventLength = eventEndIndex - currentScanIndex + eventDelimiter.length;
      // Process the complete event
      if (event.startsWith('data: ')) {
        const jsonString = event.substring(6);
        if (jsonString === '[DONE]') {
          // If DONE is encountered, stop processing further in this buffer
          currentScanIndex += eventLength; // Consume the [DONE] event
          this.processedBufferIndex = currentScanIndex; // Update index
          return newlyProcessedText; // Return what we have processed so far
        }

        const data = JSON.parse(jsonString);
        const chunk = data?.choices?.[0]?.delta?.content;
        if (chunk) {
          newlyProcessedText += chunk;
          // Emit the chunk as soon as it's processed
          this.emit('streamChunk', {
            model: this.model,
            provider: this.config.provider,
            nickname: this.nickname,
            queryId: this.queryId,
            text: chunk,
          });
        }
      } else {
        // If an event doesn't start with 'data: ', it might be a comment or other SSE line
        // We should still consume it from the buffer to avoid infinite loops
      }

      currentScanIndex += eventLength;
    }

    // Update the processed buffer index to the end of the last *complete* event processed
    this.processedBufferIndex = currentScanIndex;

    return newlyProcessedText; // Return the combined text of newly processed chunks
  }
}
