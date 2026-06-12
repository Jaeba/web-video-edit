import {getSample} from './specimen-grid.js';
import type {KnownReplicate} from './types.js';

export interface NumericChannelView {
  channelCount: number;
  channelLabel(channel: number): string | undefined;
  valueAt(y: number, x: number, t: number, channel: number): number;
}

const CHANNEL_LABELS: Record<KnownReplicate['variant'], string[]> = {
  rgb: ['R', 'G', 'B'],
  yuv: ['Y', 'U', 'V'],
  luminance: ['Y'],
};

export function asNumericChannels(replicate: KnownReplicate): NumericChannelView {
  const labels = CHANNEL_LABELS[replicate.variant];

  return {
    channelCount: replicate.valuesPerSample,
    channelLabel: (channel) => labels[channel],
    valueAt: (y, x, t, channel) => getSample(replicate, y, x, t)[channel],
  };
}

export function collectChannelValues(replicate: KnownReplicate, channel: number): number[] {
  const values: number[] = [];

  for (let y = 0; y < replicate.height; y++) {
    for (let x = 0; x < replicate.width; x++) {
      for (let t = 0; t < replicate.depth; t++) {
        values.push(getSample(replicate, y, x, t)[channel]);
      }
    }
  }

  return values;
}

export function histogram(values: number[], binCount = 256): number[] {
  const bins = new Array<number>(binCount).fill(0);
  const maxValue = binCount - 1;

  for (const value of values) {
    const bin = Math.max(0, Math.min(maxValue, Math.round(value)));
    bins[bin]++;
  }

  return bins;
}

export function channelHistogram(replicate: KnownReplicate, channel: number, binCount = 256): number[] {
  return histogram(collectChannelValues(replicate, channel), binCount);
}
