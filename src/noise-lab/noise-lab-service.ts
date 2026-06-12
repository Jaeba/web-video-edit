import {getFileStorage} from '@/medialibrary/file-storage';
import {NoiseLabView} from './noise-lab-view.js';
import {RegionSelector} from './region-selector.js';
import {buildSpecimen} from './specimen-builder.js';
import {VideoFrameReader} from './video-frame-reader.js';
import type {PixelSpecimen, Region, SpecimenConfig} from './types.js';

export class NoiseLabService {
  #view: NoiseLabView;
  #fileStorage = getFileStorage();
  #regionSelector: RegionSelector | null = null;
  #previewReader: VideoFrameReader | null = null;
  #selectedVideoId: string | null = null;
  #videoBuffer: ArrayBuffer | null = null;
  #currentFrame = 0;
  #frameLoadToken = 0;
  #specimen: PixelSpecimen | null = null;

  constructor(view: NoiseLabView) {
    this.#view = view;
  }

  async init(): Promise<void> {
    const canvas = this.#view.getPreviewCanvas();
    if (canvas) {
      this.#regionSelector = new RegionSelector(canvas);
      this.#regionSelector.setChangeCallback((region) => {
        this.#view.setRegion(region, false);
        this.#view.clearSpecimenInfo();
      });
    }

    this.#view.setVideoSelectedCallback((fileId) => this.#onVideoSelected(fileId));
    this.#view.setFrameChangedCallback((frame) => this.#onFrameChanged(frame));
    this.#view.setRegionChangedCallback((region) => this.#onRegionChanged(region));
    this.#view.setPrepareSpecimenCallback(() => this.#prepareSpecimen());

    await this.#loadVideoList();
  }

  getSpecimen(): PixelSpecimen | null {
    return this.#specimen;
  }

  async #loadVideoList(): Promise<void> {
    await this.#fileStorage.init();
    const files = await this.#fileStorage.getAllFiles();
    this.#view.updateVideoList(files);
  }

  async #onVideoSelected(fileId: string): Promise<void> {
    this.#selectedVideoId = fileId;
    this.#specimen = null;
    this.#view.clearSpecimenInfo();
    this.#view.setLoading(true, 'Loading video...');

    this.#previewReader?.close();
    this.#previewReader = new VideoFrameReader();

    try {
      const storedFile = await this.#fileStorage.getFile(fileId);
      if (!storedFile) {
        throw new Error('File not found in storage');
      }

      this.#videoBuffer = await storedFile.blob.arrayBuffer();
      const info = await this.#previewReader.open(this.#videoBuffer);
      this.#view.setVideoInfo(info);
      this.#regionSelector?.setVideoDimensions(info.width, info.height);

      const defaultSide = Math.min(64, info.width, info.height);
      const defaultRegion: Region = {
        x: Math.floor((info.width - defaultSide) / 2),
        y: Math.floor((info.height - defaultSide) / 2),
        w: defaultSide,
        h: defaultSide,
      };

      this.#currentFrame = 0;
      this.#view.setStartFrame(0);
      this.#view.setRegion(defaultRegion);
      this.#regionSelector?.setRegion(defaultRegion);

      await this.#loadPreviewFrame(0);
    } catch (error) {
      console.error('Noise Lab video load error:', error);
      this.#view.setVideoInfo(null);
      this.#regionSelector?.setFrame(null);
    } finally {
      this.#view.setLoading(false);
    }
  }

  async #onFrameChanged(frame: number): Promise<void> {
    this.#currentFrame = frame;
    await this.#loadPreviewFrame(frame);
  }

  #onRegionChanged(region: Region): void {
    const square: Region = {
      x: region.x,
      y: region.y,
      w: Math.max(1, region.w),
      h: Math.max(1, region.w),
    };
    this.#regionSelector?.setRegion(square);
    this.#view.setRegion(square, false);
    this.#view.clearSpecimenInfo();
  }

  async #loadPreviewFrame(frame: number): Promise<void> {
    if (!this.#previewReader) {
      return;
    }

    const token = ++this.#frameLoadToken;
    const bitmap = await this.#previewReader.getFrameBitmap(frame);

    if (token !== this.#frameLoadToken) {
      bitmap?.close();
      return;
    }

    this.#regionSelector?.setFrame(bitmap);
  }

  async #prepareSpecimen(): Promise<void> {
    const videoId = this.#view.getSelectedVideoId();
    const params = this.#view.getSpecimenParams();

    if (!videoId || !params || !this.#videoBuffer) {
      return;
    }

    const config: SpecimenConfig = {
      videoId,
      x: params.region.x,
      y: params.region.y,
      w: params.region.w,
      h: params.region.h,
      startFrame: params.startFrame,
      frameCount: params.frameCount,
    };

    this.#view.setPreparing(true);
    this.#view.clearSpecimenInfo();

    try {
      const specimen = await buildSpecimen(this.#videoBuffer, config, (progress) => {
        this.#view.updateProgress(progress);
      });

      this.#specimen = specimen;
      this.#view.showSpecimenReady(specimen, config.w, config.frameCount);
    } catch (error) {
      console.error('Specimen preparation failed:', error);
      this.#view.updateProgress({
        message: error instanceof Error ? error.message : 'Preparation failed',
        percent: 0,
      });
    } finally {
      this.#view.setPreparing(false);
      this.#view.hideProgress();
    }
  }
}
