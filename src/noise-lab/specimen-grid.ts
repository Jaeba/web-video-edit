import type {NumericArrayConstructor, NumericSampleArray, SpecimenReplicate} from './types.js';

export function sampleCount(width: number, height: number, depth: number, valuesPerSample: number): number {
  return width * height * depth * valuesPerSample;
}

export function createSamples(
  width: number,
  height: number,
  depth: number,
  valuesPerSample: number,
  ArrayType: NumericArrayConstructor = Uint8Array
): NumericSampleArray {
  return new ArrayType(sampleCount(width, height, depth, valuesPerSample));
}

export function sampleBase(replicate: SpecimenReplicate, y: number, x: number, t: number): number {
  return ((y * replicate.width + x) * replicate.depth + t) * replicate.valuesPerSample;
}

export function getSample(
  replicate: SpecimenReplicate,
  y: number,
  x: number,
  t: number,
  target: number[] = []
): number[] {
  const base = sampleBase(replicate, y, x, t);
  target.length = replicate.valuesPerSample;

  for (let channel = 0; channel < replicate.valuesPerSample; channel++) {
    target[channel] = replicate.samples[base + channel];
  }

  return target;
}

export function setSample(
  replicate: SpecimenReplicate,
  y: number,
  x: number,
  t: number,
  values: ArrayLike<number>
): void {
  const base = sampleBase(replicate, y, x, t);

  for (let channel = 0; channel < replicate.valuesPerSample; channel++) {
    replicate.samples[base + channel] = values[channel];
  }
}

export function assertReplicateDimensions(replicate: SpecimenReplicate): void {
  const expectedLength = sampleCount(replicate.width, replicate.height, replicate.depth, replicate.valuesPerSample);

  if (replicate.samples.length !== expectedLength) {
    throw new Error(
      `Replicate "${replicate.variant}" sample length ${replicate.samples.length} does not match ` +
        `${replicate.width}x${replicate.height}x${replicate.depth}x${replicate.valuesPerSample}=${expectedLength}`
    );
  }
}

export function estimateReplicateBytes(replicate: SpecimenReplicate): number {
  return replicate.samples.byteLength;
}

export function estimateSpecimenBytes(
  width: number,
  height: number,
  depth: number,
  valuesPerSample: number,
  bytesPerElement = 1
): number {
  return sampleCount(width, height, depth, valuesPerSample) * bytesPerElement;
}

export function formatMemorySize(bytes: number): string {
  const megabytes = bytes / (1024 * 1024);

  if (megabytes >= 0.01) {
    return `${megabytes.toFixed(2)}Mb`;
  }

  const kilobytes = bytes / 1024;
  return `${kilobytes.toFixed(1)}Kb`;
}

export function formatReplicateMemorySize(replicate: SpecimenReplicate): string {
  return formatMemorySize(estimateReplicateBytes(replicate));
}

export function formatSpecimenMemorySize(
  width: number,
  height: number,
  depth: number,
  valuesPerSample: number,
  bytesPerElement = 1
): string {
  return formatMemorySize(estimateSpecimenBytes(width, height, depth, valuesPerSample, bytesPerElement));
}
