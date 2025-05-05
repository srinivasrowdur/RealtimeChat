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