import {beforeEach, describe, expect, jest, test} from '@jest/globals';

const {createRgbReplicate} = await import('@/noise-lab/specimen-builder');
const {setSample} = await import('@/noise-lab/specimen-grid');
const {
  clampAxisValue,
  crossSection,
  crossSectionPixelSize,
  defaultSampleToRgb,
  fitSurveyScale,
  survey,
  surveyPixelSize,
} = await import('@/noise-lab/specimen-visualization');

describe('specimen-visualization', () => {
  let replicate: Awaited<ReturnType<typeof createRgbReplicate>>;
  let context: CanvasRenderingContext2D;
  let fillRect: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    replicate = createRgbReplicate(4, 3, 5);
    fillRect = jest.fn();
    context = {fillStyle: '', fillRect} as unknown as CanvasRenderingContext2D;
  });

  test('defaultSampleToRgb uses first three channels or grayscale', () => {
    expect(defaultSampleToRgb([10, 20, 30])).toEqual([10, 20, 30]);
    expect(defaultSampleToRgb([128])).toEqual([128, 128, 128]);
  });

  test('clampAxisValue floors and clamps to axis bounds', () => {
    expect(clampAxisValue(replicate, 1, 1.9)).toBe(1);
    expect(clampAxisValue(replicate, 1, 99)).toBe(3);
    expect(clampAxisValue(replicate, 2, -1)).toBe(0);
  });

  test('crossSectionPixelSize reports scaled slice dimensions', () => {
    expect(crossSectionPixelSize(replicate, 1, 2)).toEqual({width: 6, height: 10});
    expect(crossSectionPixelSize(replicate, 2, 2)).toEqual({width: 8, height: 6});
  });

  test('crossSection draws one scaled pixel per sample', () => {
    setSample(replicate, 0, 2, 1, [255, 0, 0]);

    crossSection(context, replicate, 1, 2, 100, 200, 2.5, null);

    expect(fillRect).toHaveBeenCalledTimes(replicate.height * replicate.depth);
    expect(fillRect).toHaveBeenCalledWith(200, 100 + 1 * 2.5, 2.5, 2.5);
  });

  test('crossSection uses toRgb for display mapping only', () => {
    setSample(replicate, 1, 1, 1, [10, 20, 30]);

    crossSection(context, replicate, 2, 1, 0, 0, 1, (sample) => [sample[0], 0, 0]);

    expect(fillRect).toHaveBeenCalledWith(1, 1, 1, 1);
  });

  test('survey draws all samples across nine cross sections', () => {
    survey(context, replicate, 10, 20, 2, null, 1);

    const expectedRects =
      3 * replicate.width * replicate.height +
      3 * replicate.width * replicate.depth +
      3 * replicate.height * replicate.depth;

    expect(fillRect).toHaveBeenCalledTimes(expectedRects);
  });

  test('fitSurveyScale returns a positive scale for typical canvases', () => {
    expect(fitSurveyScale(replicate, 300, 300)).toBeGreaterThan(0);
    expect(surveyPixelSize(replicate, 2, 1).width).toBeGreaterThan(0);
  });
});
