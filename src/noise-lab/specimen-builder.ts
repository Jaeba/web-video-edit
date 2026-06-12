import {createSamples, setSample} from './specimen-grid.js';
import type {RgbReplicate, SpecimenBundle, SpecimenConfig, SpecimenProgress} from './types.js';
import {VideoFrameReader} from './video-frame-reader.js';

const RGB_VALUES_PER_SAMPLE = 3;

export function createRgbReplicate(width: number, height: number, depth: number): RgbReplicate {
  return {
    variant: 'rgb',
    width,
    height,
    depth,
    valuesPerSample: RGB_VALUES_PER_SAMPLE,
    samples: createSamples(width, height, depth, RGB_VALUES_PER_SAMPLE, Uint8Array),
  };
}

export function fillReplicateFromPixels(
  replicate: RgbReplicate,
  pixels: Uint8ClampedArray,
  frameIndex: number
): void {
  for (let y = 0; y < replicate.height; y++) {
    for (let x = 0; x < replicate.width; x++) {
      const offset = (y * replicate.width + x) * 4;
      setSample(replicate, y, x, frameIndex, [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      ]);
    }
  }
}

export async function buildSpecimen(
  videoData: ArrayBuffer,
  config: SpecimenConfig,
  onProgress?: (progress: SpecimenProgress) => void
): Promise<SpecimenBundle> {
  const reader = new VideoFrameReader();

  try {
    onProgress?.({message: 'Indexing video frames...', percent: 0});
    await reader.open(videoData, (percent) => {
      onProgress?.({message: 'Indexing video frames...', percent: percent * 0.2});
    });

    const {x, y, w, h, startFrame, frameCount} = config;

    if (startFrame + frameCount > reader.frameCount) {
      throw new Error(
        `Frame range exceeds video length (need frames ${startFrame}–${startFrame + frameCount - 1}, have ${reader.frameCount})`
      );
    }

    if (x + w > reader.width || y + h > reader.height) {
      throw new Error('Region extends beyond video frame bounds');
    }

    const rgb = createRgbReplicate(w, h, frameCount);

    for (let k = 0; k < frameCount; k++) {
      const frameIndex = startFrame + k;
      onProgress?.({
        message: `Extracting frame ${k + 1} of ${frameCount}...`,
        percent: 20 + ((k / frameCount) * 80),
      });

      const pixels = await reader.getRegionPixels(frameIndex, x, y, w, h);
      if (!pixels) {
        throw new Error(`Failed to read frame ${frameIndex}`);
      }

      fillReplicateFromPixels(rgb, pixels, k);
    }

    onProgress?.({message: 'Specimen ready', percent: 100});

    return {
      config,
      replicates: new Map([['rgb', rgb]]),
    };
  } finally {
    reader.close();
  }
}
