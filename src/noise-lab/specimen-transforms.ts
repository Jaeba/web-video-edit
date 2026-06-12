import {createSamples, getSample, setSample} from './specimen-grid.js';
import type {
  LuminanceReplicate,
  RgbReplicate,
  SpecimenBundle,
  SpecimenReplicate,
  YuvReplicate,
} from './types.js';

function rgbSampleToYuv(r: number, g: number, b: number): [number, number, number] {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const u = -0.169 * r - 0.331 * g + 0.5 * b + 128;
  const v = 0.5 * r - 0.419 * g - 0.081 * b + 128;

  return [clampByte(y), clampByte(u), clampByte(v)];
}

function rgbSampleToLuminance(r: number, g: number, b: number): number {
  return clampByte(0.2126 * r + 0.7152 * g + 0.0722 * b);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function rgbToYuv(rgb: RgbReplicate): YuvReplicate {
  const yuv: YuvReplicate = {
    variant: 'yuv',
    width: rgb.width,
    height: rgb.height,
    depth: rgb.depth,
    valuesPerSample: 3,
    samples: createSamples(rgb.width, rgb.height, rgb.depth, 3, Uint8Array),
  };

  forEachVoxel(rgb, (y, x, t) => {
    const [r, g, b] = getSample(rgb, y, x, t);
    setSample(yuv, y, x, t, rgbSampleToYuv(r, g, b));
  });

  return yuv;
}

export function rgbToLuminance(rgb: RgbReplicate): LuminanceReplicate {
  const luminance: LuminanceReplicate = {
    variant: 'luminance',
    width: rgb.width,
    height: rgb.height,
    depth: rgb.depth,
    valuesPerSample: 1,
    samples: createSamples(rgb.width, rgb.height, rgb.depth, 1, Uint8Array),
  };

  forEachVoxel(rgb, (y, x, t) => {
    const [r, g, b] = getSample(rgb, y, x, t);
    setSample(luminance, y, x, t, [rgbSampleToLuminance(r, g, b)]);
  });

  return luminance;
}

export function addDerivedReplicates(bundle: SpecimenBundle): SpecimenBundle {
  const rgb = bundle.replicates.get('rgb');

  if (!rgb || rgb.variant !== 'rgb') {
    throw new Error('Specimen bundle must contain an RGB replicate');
  }

  const replicates = new Map(bundle.replicates);
  replicates.set('yuv', rgbToYuv(rgb));
  replicates.set('luminance', rgbToLuminance(rgb));

  return {
    config: bundle.config,
    replicates,
  };
}

function forEachVoxel(
  replicate: SpecimenReplicate,
  callback: (y: number, x: number, t: number) => void
): void {
  for (let y = 0; y < replicate.height; y++) {
    for (let x = 0; x < replicate.width; x++) {
      for (let t = 0; t < replicate.depth; t++) {
        callback(y, x, t);
      }
    }
  }
}