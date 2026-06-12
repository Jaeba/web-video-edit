import {getSample} from './specimen-grid.js';
import type {SpecimenReplicate} from './types.js';

export type SampleToRgb = (sample: number[]) => [number, number, number];

export type CrossSectionAxis = 0 | 1 | 2;

// 0: fixed y and (u, v) = (x, z)
// 1: fixed x and (u, v) = (z, y)
// 2: fixed z and (u, v) = (x, y)

export interface CrossSectionPixelSize {
  width: number;
  height: number;
}

const AXIS_SIZE: Array<keyof Pick<SpecimenReplicate, 'height' | 'width' | 'depth'>> = [
  'height',
  'width',
  'depth',
];

function resolveContext(canvas: HTMLCanvasElement | CanvasRenderingContext2D): CanvasRenderingContext2D {
  if (canvas instanceof HTMLCanvasElement) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas 2D context unavailable');
    }

    return context;
  }

  return canvas;
}

export function defaultSampleToRgb(sample: number[]): [number, number, number] {
  if (sample.length >= 3) {
    return [sample[0], sample[1], sample[2]];
  }

  const value = sample[0] ?? 0;
  return [value, value, value];
}

export function clampAxisValue(replicate: SpecimenReplicate, axis: CrossSectionAxis, value: number): number {
  const size = replicate[AXIS_SIZE[axis]];

  if (size <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(size - 1, Math.floor(value)));
}

function readSampleAtAxis(
  replicate: SpecimenReplicate,
  axis: CrossSectionAxis,
  axisValue: number,
  u: number,
  v: number
): number[] {
  switch (axis) {
    case 0:
      return getSample(replicate, axisValue, u, v);
    case 1:
      return getSample(replicate, v, axisValue, u);
    case 2:
      return getSample(replicate, v, u, axisValue);
  }
}

export function crossSectionPixelSize(
  replicate: SpecimenReplicate,
  axis: CrossSectionAxis,
  scaleX: number,
  scaleY = scaleX
): CrossSectionPixelSize {
  switch (axis) {
    case 0:
      return {width: replicate.width * scaleX, height: replicate.depth * scaleY};
    case 1:
      return {width: replicate.depth * scaleX, height: replicate.height * scaleY};
    case 2:
      return {width: replicate.width * scaleX, height: replicate.height * scaleY};
  }
}

export function crossSection(
  canvas: HTMLCanvasElement | CanvasRenderingContext2D,
  replicate: SpecimenReplicate,
  axis: CrossSectionAxis,
  axisValue: number,
  destY: number,
  destX: number,
  scale: number,
  toRgb: SampleToRgb | null = null,
  scaleX = scale,
  scaleY = scale
): CrossSectionPixelSize {
  const context = resolveContext(canvas);
  const colorize = toRgb ?? defaultSampleToRgb;
  const fixed = clampAxisValue(replicate, axis, axisValue);
  const pixelSize = crossSectionPixelSize(replicate, axis, scaleX, scaleY);

  let uLimit = 0;
  let vLimit = 0;

  switch (axis) {
    case 0:
      uLimit = replicate.width;
      vLimit = replicate.depth;
      break;
    case 1:
      uLimit = replicate.depth;
      vLimit = replicate.height;
      break;
    case 2:
      uLimit = replicate.width;
      vLimit = replicate.height;
      break;
  }

  for (let v = 0; v < vLimit; v++) {
    for (let u = 0; u < uLimit; u++) {
      const [r, g, b] = colorize(readSampleAtAxis(replicate, axis, fixed, u, v));
      context.fillStyle = `rgb(${r}, ${g}, ${b})`;
      context.fillRect(destX + u * scaleX, destY + v * scaleY, scaleX, scaleY);
    }
  }

  return pixelSize;
}

export function surveyPixelSize(
  replicate: SpecimenReplicate,
  scale: number,
  padding = scale,
  margin = padding
): CrossSectionPixelSize {
  const columnWidth = Math.max(replicate.width, replicate.depth) * scale;
  const rowHeight = Math.max(replicate.height, replicate.depth) * scale;
  return {
    width: columnWidth * 3 + padding * 2 + margin * 2,
    height: rowHeight * 3 + padding * 2 + margin * 2
  };
}

export function survey(
  canvas: HTMLCanvasElement | CanvasRenderingContext2D,
  replicate: SpecimenReplicate,
  destY: number,
  destX: number,
  scale: number,
  toRgb: SampleToRgb | null = null,
  padding = scale,
  margin = padding
): CrossSectionPixelSize {
  const {width, height, depth} = replicate;
  const zValues = [0, Math.floor(depth / 2), depth - 1];
  const yValues = [0, Math.floor(height / 2), height - 1];
  const xValues = [0, Math.floor(width / 2), width - 1];

  const columnWidth = Math.max(width, depth) * scale;
  const rowHeight = Math.max(height, depth) * scale;

  // ROW 1: z-cross-sections
  let rowY = destY + margin;
  let columnX = destX + margin;
  for (const z of zValues) {
    crossSection(canvas, replicate, 2, z, rowY, columnX, scale, toRgb);
    columnX += columnWidth + padding;
  }

  // ROW 2: y-cross-sections
  rowY += rowHeight + padding;
  columnX = destX + margin;
  for (const y of yValues) {
    crossSection(canvas, replicate, 0, y, rowY, columnX, scale, toRgb);
    columnX += columnWidth + padding;
  }

  // ROW 3: x-cross-sections
  rowY += rowHeight + padding;
  columnX = destX + margin;
  for (const x of xValues) {
    crossSection(canvas, replicate, 1, x, rowY, columnX, scale, toRgb);
    columnX += columnWidth + padding;
  }

  return {
    width: columnWidth * 3 + padding * 2 + margin * 2,
    height: rowHeight * 3 + padding * 2 + margin * 2
  };
}
