import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(currentDir, '..', 'fixtures');
export const SAMPLE_AUDIO_1 = path.join(FIXTURES_DIR, 'sample-audio-1.mp3');
export const SAMPLE_AUDIO_2 = path.join(FIXTURES_DIR, 'sample-audio-2.mp3');
export const SAMPLE_VIDEO = path.join(FIXTURES_DIR, 'sample-video.mp4');

export function uniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
