import {beforeEach, describe, expect, test} from '@jest/globals';

const {createRgbReplicate, fillReplicateFromPixels} = await import('@/noise-lab/specimen-builder');
const {
  estimateSpecimenBytes,
  formatSpecimenMemorySize,
  getSample,
  sampleCount,
} = await import('@/noise-lab/specimen-grid');

describe('specimen-builder', () => {
  describe('createRgbReplicate', () => {
    test('creates typed array with correct dimensions', () => {
      const replicate = createRgbReplicate(3, 2, 4);

      expect(replicate.variant).toBe('rgb');
      expect(replicate.width).toBe(3);
      expect(replicate.height).toBe(2);
      expect(replicate.depth).toBe(4);
      expect(replicate.valuesPerSample).toBe(3);
      expect(replicate.samples).toBeInstanceOf(Uint8Array);
      expect(replicate.samples.length).toBe(sampleCount(3, 2, 4, 3));
      expect(getSample(replicate, 0, 0, 0)).toEqual([0, 0, 0]);
      expect(getSample(replicate, 1, 2, 3)).toEqual([0, 0, 0]);
    });
  });

  describe('formatSpecimenMemorySize', () => {
    test('formats megabytes for typical specimens', () => {
      expect(estimateSpecimenBytes(64, 64, 30, 3)).toBe(64 * 64 * 30 * 3);
      expect(formatSpecimenMemorySize(64, 64, 30, 3)).toBe('0.35Mb');
    });

    test('formats kilobytes for small specimens', () => {
      expect(formatSpecimenMemorySize(4, 4, 2, 3)).toBe('0.1Kb');
    });
  });

  describe('fillReplicateFromPixels', () => {
    let replicate: Awaited<ReturnType<typeof createRgbReplicate>>;

    beforeEach(() => {
      replicate = createRgbReplicate(2, 2, 2);
    });

    test('fills RGB channels for the given frame index', () => {
      const pixels = new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        128, 64, 32, 255,
      ]);

      fillReplicateFromPixels(replicate, pixels, 0);

      expect(getSample(replicate, 0, 0, 0)).toEqual([255, 0, 0]);
      expect(getSample(replicate, 0, 1, 0)).toEqual([0, 255, 0]);
      expect(getSample(replicate, 1, 0, 0)).toEqual([0, 0, 255]);
      expect(getSample(replicate, 1, 1, 0)).toEqual([128, 64, 32]);
      expect(getSample(replicate, 0, 0, 1)).toEqual([0, 0, 0]);
    });
  });
});
