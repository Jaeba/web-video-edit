import {createDemuxer} from '@/video/demux';
import {LayerFile, VideoMetadata} from '@/mediaclip/types';
import {MediaBunnyDemuxer} from "@/video/demux/mediabunny-demuxer";

type ProgressCallback = (progress: number) => void;

export class VideoLoader {
  private videoDemuxer: MediaBunnyDemuxer;

  constructor() {
    this.videoDemuxer = createDemuxer();
  }

  async loadVideo(file: LayerFile, onProgress: ProgressCallback): Promise<VideoMetadata> {
    let metadata: VideoMetadata | null = null;

    this.videoDemuxer.setOnProgressCallback(onProgress);
    this.videoDemuxer.setOnCompleteCallback((videoMetadata: VideoMetadata) => {
      metadata = videoMetadata;
    });

    await this.#readFileAsDataUrl(file);

    try {
      await this.videoDemuxer.initialize(file as File);
    } catch (error) {
      this.videoDemuxer.cleanup();
      throw error instanceof Error ? error : new Error('Failed to decode video');
    }

    if (!metadata) {
      this.videoDemuxer.cleanup();
      throw new Error('Failed to load video metadata');
    }

    return metadata;
  }

  #readFileAsDataUrl(file: LayerFile): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener('load', () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Failed to read video file'));
          return;
        }
        file.uri = reader.result;
        resolve();
      }, false);

      reader.addEventListener('error', () => {
        reject(new Error('Failed to read video file'));
      }, false);

      reader.readAsDataURL(file as File);
    });
  }

}
