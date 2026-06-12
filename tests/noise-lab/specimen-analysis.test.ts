import {describe, expect, test} from '@jest/globals';

const {createRgbReplicate} = await import('@/noise-lab/specimen-builder');
const {setSample} = await import('@/noise-lab/specimen-grid');
const {asNumericChannels, channelHistogram, collectChannelValues} = await import('@/noise-lab/specimen-analysis');
const {rgbToYuv} = await import('@/noise-lab/specimen-transforms');

describe('specimen-analysis', () => {
  test('asNumericChannels exposes variant labels and values', () => {
    const rgb = createRgbReplicate(1, 1, 1);
    setSample(rgb, 0, 0, 0, [10, 20, 30]);

    const view = asNumericChannels(rgb);

    expect(view.channelCount).toBe(3);
    expect(view.channelLabel(0)).toBe('R');
    expect(view.channelLabel(2)).toBe('B');
    expect(view.valueAt(0, 0, 0, 1)).toBe(20);
  });

  test('channelHistogram counts values for a channel', () => {
    const rgb = createRgbReplicate(2, 1, 1);
    setSample(rgb, 0, 0, 0, [0, 0, 0]);
    setSample(rgb, 0, 1, 0, [255, 0, 0]);

    const bins = channelHistogram(rgb, 0);

    expect(bins[0]).toBe(1);
    expect(bins[255]).toBe(1);
    expect(collectChannelValues(rgb, 0)).toEqual([0, 255]);
  });

  test('asNumericChannels works for yuv replicates', () => {
    const rgb = createRgbReplicate(1, 1, 1);
    setSample(rgb, 0, 0, 0, [255, 0, 0]);
    const yuv = rgbToYuv(rgb);
    const view = asNumericChannels(yuv);

    expect(view.channelLabel(1)).toBe('U');
    expect(view.valueAt(0, 0, 0, 0)).toBe(76);
  });
});
