import {describe, expect, test} from '@jest/globals';

const {createRgbReplicate} = await import('@/noise-lab/specimen-builder');
const {getSample, setSample} = await import('@/noise-lab/specimen-grid');
const {rgbToLuminance, rgbToYuv} = await import('@/noise-lab/specimen-transforms');

describe('specimen-transforms', () => {
  test('rgbToYuv converts pure red', () => {
    const rgb = createRgbReplicate(1, 1, 1);
    setSample(rgb, 0, 0, 0, [255, 0, 0]);

    const yuv = rgbToYuv(rgb);

    expect(yuv.variant).toBe('yuv');
    expect(getSample(yuv, 0, 0, 0)).toEqual([76, 85, 255]);
  });

  test('rgbToLuminance converts white and black', () => {
    const rgb = createRgbReplicate(1, 1, 2);
    setSample(rgb, 0, 0, 0, [255, 255, 255]);
    setSample(rgb, 0, 0, 1, [0, 0, 0]);

    const luminance = rgbToLuminance(rgb);

    expect(luminance.variant).toBe('luminance');
    expect(getSample(luminance, 0, 0, 0)).toEqual([255]);
    expect(getSample(luminance, 0, 0, 1)).toEqual([0]);
  });

  test('rgbToLuminance matches rec709 luma for mid gray', () => {
    const rgb = createRgbReplicate(1, 1, 1);
    setSample(rgb, 0, 0, 0, [128, 128, 128]);

    const luminance = rgbToLuminance(rgb);

    expect(getSample(luminance, 0, 0, 0)).toEqual([128]);
  });
});
