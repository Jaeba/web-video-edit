import type {PixelSpecimen, SpecimenConfig, SpecimenProgress} from './types.js';
import {VideoFrameReader} from './video-frame-reader.js';

export function createEmptySpecimen(h: number, w: number, frameCount: number): PixelSpecimen {
  const specimen: PixelSpecimen = [];
  for (let i = 0; i < h; i++) {
    const row: number[][][] = [];
    for (let j = 0; j < w; j++) {
      const column: number[][] = [];
      for (let k = 0; k < frameCount; k++) {
        column.push([0, 0, 0]);
      }
      row.push(column);
    }
    specimen.push(row);
  }
  return specimen;
}

export function fillSpecimenFromPixels(
  specimen: PixelSpecimen,
  pixels: Uint8ClampedArray,
  w: number,
  frameIndex: number
): void {
  const h = specimen.length;
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const offset = (i * w + j) * 4;
      specimen[i][j][frameIndex] = [
        pixels[offset],
        pixels[offset + 1],
        pixels[offset + 2],
      ];
    }
  }
}

export async function buildSpecimen(
  videoData: ArrayBuffer,
  config: SpecimenConfig,
  onProgress?: (progress: SpecimenProgress) => void
): Promise<PixelSpecimen> {
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

    const specimen = createEmptySpecimen(h, w, frameCount);

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

      fillSpecimenFromPixels(specimen, pixels, w, k);
    }

    onProgress?.({message: 'Specimen ready', percent: 100});
    return specimen;
  } finally {
    reader.close();
  }
}
