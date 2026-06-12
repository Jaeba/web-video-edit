export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpecimenConfig {
  videoId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  startFrame: number;
  frameCount: number;
}

export type SpecimenVariant = 'rgb' | 'yuv' | 'luminance';

export type NumericSampleArray =
  | Uint8Array
  | Uint16Array
  | Int16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array;

export type NumericArrayConstructor =
  | Uint8ArrayConstructor
  | Uint16ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor;

export interface SpecimenReplicate {
  variant: SpecimenVariant;
  width: number;
  height: number;
  depth: number;
  valuesPerSample: number;
  samples: NumericSampleArray;
}

export interface SpecimenBundle {
  config: SpecimenConfig;
  replicates: Map<SpecimenVariant, SpecimenReplicate>;
}

export type RgbReplicate = SpecimenReplicate & {variant: 'rgb'; valuesPerSample: 3};
export type YuvReplicate = SpecimenReplicate & {variant: 'yuv'; valuesPerSample: 3};
export type LuminanceReplicate = SpecimenReplicate & {variant: 'luminance'; valuesPerSample: 1};

export type KnownReplicate = RgbReplicate | YuvReplicate | LuminanceReplicate;

export interface VideoFrameInfo {
  width: number;
  height: number;
  frameCount: number;
}

export interface SpecimenProgress {
  message: string;
  percent: number;
}
