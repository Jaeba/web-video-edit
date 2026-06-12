import {NoiseLabService} from './noise-lab-service.js';
import {NoiseLabView} from './noise-lab-view.js';

export {NoiseLabService} from './noise-lab-service.js';
export {NoiseLabView} from './noise-lab-view.js';
export {
  buildSpecimen,
  calculatePixelSpecimenBytes,
  createEmptySpecimen,
  fillSpecimenFromPixels,
  formatPixelSpecimenMemorySize,
} from './specimen-builder.js';
export {VideoFrameReader} from './video-frame-reader.js';
export {RegionSelector} from './region-selector.js';
export type {
  Region,
  SpecimenConfig,
  PixelSpecimen,
  VideoFrameInfo,
  SpecimenProgress,
} from './types.js';

export function createNoiseLabService(): NoiseLabService {
  return new NoiseLabService(new NoiseLabView());
}
