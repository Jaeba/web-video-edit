import {describe, expect, test} from '@jest/globals';

const {createSamples, getSample, sampleBase, setSample} = await import('@/noise-lab/specimen-grid');

describe('specimen-grid', () => {
  test('sampleBase uses row-major y, x, t ordering', () => {
    const replicate = {
      variant: 'rgb' as const,
      width: 3,
      height: 2,
      depth: 4,
      valuesPerSample: 3,
      samples: createSamples(3, 2, 4, 3),
    };

    expect(sampleBase(replicate, 0, 0, 0)).toBe(0);
    expect(sampleBase(replicate, 0, 0, 1)).toBe(3);
    expect(sampleBase(replicate, 0, 1, 0)).toBe(12);
    expect(sampleBase(replicate, 1, 0, 0)).toBe(36);
  });

  test('setSample and getSample round-trip values', () => {
    const replicate = {
      variant: 'luminance' as const,
      width: 2,
      height: 2,
      depth: 2,
      valuesPerSample: 1,
      samples: createSamples(2, 2, 2, 1, Float32Array),
    };

    setSample(replicate, 1, 1, 1, [42]);
    expect(getSample(replicate, 1, 1, 1)).toEqual([42]);
    expect(replicate.samples[replicate.samples.length - 1]).toBe(42);
  });
});
