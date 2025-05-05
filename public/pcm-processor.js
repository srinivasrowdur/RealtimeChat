/**
 * @license MIT
 * Copyright (c) 2024 RealtimeCjhat
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = 24000;
    this.buffer = [];
    this.bufferSize = 1024;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (input.length === 0) return true;

    const inputChannel = input[0];
    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer.push(inputChannel[i]);
    }

    if (this.buffer.length >= this.bufferSize) {
      const pcmData = new Int16Array(this.buffer.length);
      for (let i = 0; i < this.buffer.length; i++) {
        // Scale and clamp the audio samples to 16-bit PCM range
        pcmData[i] = Math.max(-32768, Math.min(32767, Math.round(this.buffer[i] * 32767)));
      }
      
      this.port.postMessage({
        audio_data: pcmData.buffer
      }, [pcmData.buffer]);
      
      this.buffer = [];
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor); 