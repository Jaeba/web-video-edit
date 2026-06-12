import { VideoLoader } from '@/mediaclip/video-loader';
import { LayerFile, VideoMetadata } from '@/mediaclip/types';

export async function loadVideo(
  file: LayerFile,
  onProgress: (progress: number) => void
): Promise<VideoMetadata> {
  return new VideoLoader().loadVideo(file, onProgress);
}