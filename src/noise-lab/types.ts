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

export type PixelSpecimen = number[][][][];

export interface VideoFrameInfo {
  width: number;
  height: number;
  frameCount: number;
}

export interface SpecimenProgress {
  message: string;
  percent: number;
}
