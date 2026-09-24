export function encodePcm16(samples: Float32Array) {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return { data: btoa(binary), mimeType: 'audio/pcm;rate=16000' };
}

export function decodePcm16(bytes: Uint8Array, context: AudioContext, sampleRate = 24000) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = Math.floor(bytes.byteLength / 2);
  const buffer = context.createBuffer(1, samples, sampleRate);
  const channel = buffer.getChannelData(0);
  for (let index = 0; index < samples; index += 1) {
    channel[index] = view.getInt16(index * 2, true) / 32768;
  }
  return buffer;
}

export function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
