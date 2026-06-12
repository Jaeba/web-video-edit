import {beforeEach, describe, expect, test} from '@jest/globals';

const {
  createEmptySpecimen,
  fillSpecimenFromPixels,
  calculatePixelSpecimenBytes,
  formatPixelSpecimenMemorySize,
} = await import('@/noise-lab/specimen-builder');

describe('specimen-builder', () => {
  describe('createEmptySpecimen', () => {
    test('creates array with correct dimensions', () => {
      const specimen = createEmptySpecimen(2, 3, 4);

      expect(specimen).toHaveLength(2);
      expect(specimen[0]).toHaveLength(3);
      expect(specimen[0][0]).toHaveLength(4);
      expect(specimen[0][0][0]).toEqual([0, 0, 0]);
      expect(specimen[1][2][3]).toEqual([0, 0, 0]);
    });
  });

  describe('formatPixelSpecimenMemorySize', () => {
    test('formats megabytes for typical specimens', () => {
      expect(calculatePixelSpecimenBytes(64, 64, 30)).toBe(64 * 64 * 30 * 3 * 8);
      expect(formatPixelSpecimenMemorySize(64, 64, 30)).toBe('2.81Mb');
    });

    test('formats kilobytes for small specimens', () => {
      expect(formatPixelSpecimenMemorySize(4, 4, 2)).toBe('0.8Kb');
    });
  });

  describe('fillSpecimenFromPixels', () => {
    let specimen: number[][][][];

    beforeEach(() => {
      specimen = createEmptySpecimen(2, 2, 2);
    });

    test('fills RGB channels for the given frame index', () => {
      const pixels = new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        128, 64, 32, 255,
      ]);

      fillSpecimenFromPixels(specimen, pixels, 2, 0);

      expect(specimen[0][0][0]).toEqual([255, 0, 0]);
      expect(specimen[0][1][0]).toEqual([0, 255, 0]);
      expect(specimen[1][0][0]).toEqual([0, 0, 255]);
      expect(specimen[1][1][0]).toEqual([128, 64, 32]);
      expect(specimen[0][0][1]).toEqual([0, 0, 0]);
    });
  });
});
