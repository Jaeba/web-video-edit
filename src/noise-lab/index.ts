import {NoiseLabService} from './noise-lab-service.js';
import {NoiseLabView} from './noise-lab-view.js';

export {NoiseLabService} from './noise-lab-service.js';
export {NoiseLabView} from './noise-lab-view.js';
export {buildSpecimen, createRgbReplicate, fillReplicateFromPixels} from './specimen-builder.js';
export {
  asNumericChannels,
  channelHistogram,
  collectChannelValues,
  histogram,
} from './specimen-analysis.js';
export type {NumericChannelView} from './specimen-analysis.js';
export {
  addDerivedReplicates,
  rgbToLuminance,
  rgbToYuv,
} from './specimen-transforms.js';
export {
  clampAxisValue,
  crossSection,
  crossSectionPixelSize,
  defaultSampleToRgb,
  survey,
  surveyPixelSize,
} from './specimen-visualization.js';
export type {CrossSectionAxis, CrossSectionPixelSize, SampleToRgb} from './specimen-visualization.js';
export {
  assertReplicateDimensions,
  createSamples,
  estimateReplicateBytes,
  estimateSpecimenBytes,
  formatMemorySize,
  formatReplicateMemorySize,
  formatSpecimenMemorySize,
  getSample,
  sampleBase,
  sampleCount,
  setSample,
} from './specimen-grid.js';
export {VideoFrameReader} from './video-frame-reader.js';
export {RegionSelector} from './region-selector.js';
export type {
  KnownReplicate,
  LuminanceReplicate,
  NumericArrayConstructor,
  NumericSampleArray,
  Region,
  RgbReplicate,
  SpecimenBundle,
  SpecimenConfig,
  SpecimenProgress,
  SpecimenReplicate,
  SpecimenVariant,
  VideoFrameInfo,
  YuvReplicate,
} from './types.js';

export function createNoiseLabService(): NoiseLabService {
  return new NoiseLabService(new NoiseLabView());
}
