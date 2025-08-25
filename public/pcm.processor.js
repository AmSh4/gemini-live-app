// public/pcm-processor.js

class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    // Get the first channel of the first input
    const input = inputs[0][0];

    // If there's no input, do nothing.
    if (!input) {
      return true;
    }

    // Simple energy-based VAD for client-side instant interruption detection
    let energy = 0;
    for (let i = 0; i < input.length; i++) {
      energy += input[i] * input[i];
    }
    energy = Math.sqrt(energy / input.length);
    if (energy > 0.01) { // Adjustable threshold; >0.01 indicates voice activity
      this.port.postMessage({ type: 'vad', active: true });
    }

    // Convert the floating-point audio data to 16-bit PCM.
    // The input values are in the range [-1.0, 1.0]. We need to scale them to [-32768, 32767].
    const pcm16 = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      // Clamp the value to the [-1, 1] range before scaling
      const s = Math.max(-1, Math.min(1, input[i]));
      // Scale to 16-bit integer range
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }

    // Post the raw buffer back to the main thread
    this.port.postMessage(pcm16.buffer, [pcm16.buffer]);

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);