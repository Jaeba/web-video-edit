import {ALL_FORMATS, BlobSource, Input, VideoSampleSink} from 'mediabunny';
import type {VideoFrameInfo} from './types.js';

export class VideoFrameReader {
  #videoSink: VideoSampleSink | null = null;
  #timestamps: number[] = [];
  #width = 0;
  #height = 0;
  #canvas = new OffscreenCanvas(1, 1);
  #context = this.#canvas.getContext('2d', {willReadFrequently: true})!;
  #decodeChain: Promise<unknown> = Promise.resolve();

  async open(
    videoData: ArrayBuffer,
    onProgress?: (percent: number) => void
  ): Promise<VideoFrameInfo> {
    this.close();

    const blob = new Blob([videoData], {type: 'video/mp4'});
    const source = new BlobSource(blob);
    const input = new Input({source, formats: ALL_FORMATS});

    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) {
      throw new Error('No video track found in the file');
    }

    if (!(await videoTrack.canDecode())) {
      throw new Error('Unable to decode the video track');
    }

    this.#width = videoTrack.displayWidth;
    this.#height = videoTrack.displayHeight;
    this.#videoSink = new VideoSampleSink(videoTrack);
    this.#timestamps = [];

    const frameIterator = this.#videoSink.samples(0);
    let frameIndex = 0;

    for await (const sample of frameIterator) {
      try {
        this.#timestamps.push(sample.timestamp);
        frameIndex++;
        if (onProgress && frameIndex % 30 === 0) {
          onProgress(Math.min(99, frameIndex));
        }
      } finally {
        sample.close();
      }
    }

    if (onProgress) {
      onProgress(100);
    }

    return {
      width: this.#width,
      height: this.#height,
      frameCount: this.#timestamps.length,
    };
  }

  get width(): number {
    return this.#width;
  }

  get height(): number {
    return this.#height;
  }

  get frameCount(): number {
    return this.#timestamps.length;
  }

  async getFrameBitmap(frameIndex: number): Promise<ImageBitmap | null> {
    if (!this.#videoSink || frameIndex < 0 || frameIndex >= this.#timestamps.length) {
      return null;
    }

    const decode = this.#decodeChain.then(() => this.#decodeFrameBitmap(frameIndex));
    this.#decodeChain = decode.catch(() => undefined);
    return decode;
  }

  async #decodeFrameBitmap(frameIndex: number): Promise<ImageBitmap | null> {
    const timestamp = this.#timestamps[frameIndex];
    let sample = null;

    try {
      sample = await this.#videoSink!.getSample(timestamp);
      if (!sample) {
        return null;
      }

      const videoFrame = sample.toVideoFrame();
      try {
        return await createImageBitmap(videoFrame);
      } finally {
        videoFrame.close();
      }
    } catch (error) {
      console.warn(`Failed to decode frame ${frameIndex}:`, error);
      return null;
    } finally {
      sample?.close();
    }
  }

  async getRegionPixels(
    frameIndex: number,
    x: number,
    y: number,
    w: number,
    h: number
  ): Promise<Uint8ClampedArray | null> {
    const bitmap = await this.getFrameBitmap(frameIndex);
    if (!bitmap) {
      return null;
    }

    try {
      this.#canvas.width = w;
      this.#canvas.height = h;
      this.#context.drawImage(bitmap, x, y, w, h, 0, 0, w, h);
      return this.#context.getImageData(0, 0, w, h).data;
    } finally {
      bitmap.close();
    }
  }

  close(): void {
    this.#videoSink = null;
    this.#timestamps = [];
    this.#width = 0;
    this.#height = 0;
    this.#decodeChain = Promise.resolve();
  }
}
