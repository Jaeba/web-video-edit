import type {StoredFileMetadata} from '@/medialibrary/file-storage';
import {formatSpecimenMemorySize} from './specimen-grid.js';
import {survey, surveyPixelSize} from './specimen-visualization.js';
import type {Region, SpecimenProgress, SpecimenReplicate, VideoFrameInfo} from './types.js';

export type VideoSelectedCallback = (fileId: string) => void;
export type FrameChangedCallback = (frame: number, immediate?: boolean) => void;
export type RegionChangedCallback = (region: Region) => void;
export type PrepareSpecimenCallback = () => void;

export class NoiseLabView {
  #container: HTMLElement | null = null;
  #videoSelector: HTMLSelectElement | null = null;
  #previewCanvas: HTMLCanvasElement | null = null;
  #frameSlider: HTMLInputElement | null = null;
  #frameLabel: HTMLElement | null = null;
  #frameCountInput: HTMLInputElement | null = null;
  #coordInputs: Record<'x' | 'y' | 'w' | 'h', HTMLInputElement | null> = {
    x: null,
    y: null,
    w: null,
    h: null,
  };
  #prepareButton: HTMLButtonElement | null = null;
  #statusEl: HTMLElement | null = null;
  #progressBar: HTMLElement | null = null;
  #specimenEstimate: HTMLElement | null = null;
  #surveySection: HTMLElement | null = null;
  #surveyCanvas: HTMLCanvasElement | null = null;
  #videoInfo: HTMLElement | null = null;

  #onVideoSelected: VideoSelectedCallback | null = null;
  #specimenReady = false;
  #onFrameChanged: FrameChangedCallback | null = null;
  #onRegionChanged: RegionChangedCallback | null = null;
  #onPrepareSpecimen: PrepareSpecimenCallback | null = null;
  #suppressRegionEvent = false;
  #maxFrames = 0;

  constructor() {
    this.#container = document.getElementById('noise-lab');
    if (this.#container) {
      this.#buildUI();
    }
  }

  getPreviewCanvas(): HTMLCanvasElement | null {
    return this.#previewCanvas;
  }

  setVideoSelectedCallback(callback: VideoSelectedCallback): void {
    this.#onVideoSelected = callback;
  }

  setFrameChangedCallback(callback: FrameChangedCallback): void {
    this.#onFrameChanged = callback;
  }

  setRegionChangedCallback(callback: RegionChangedCallback): void {
    this.#onRegionChanged = callback;
  }

  setPrepareSpecimenCallback(callback: PrepareSpecimenCallback): void {
    this.#onPrepareSpecimen = callback;
  }

  updateVideoList(files: StoredFileMetadata[]): void {
    if (!this.#videoSelector) {
      return;
    }

    const videos = files.filter((file) => file.type.startsWith('video/'));
    const current = this.#videoSelector.value;

    this.#videoSelector.innerHTML = `
      <option value="">-- Select a video --</option>
      ${videos.map((file) => `
        <option value="${this.#escapeAttr(file.id)}">${this.#escapeHtml(file.name)}</option>
      `).join('')}
    `;

    if (current && videos.some((file) => file.id === current)) {
      this.#videoSelector.value = current;
    }
  }

  setVideoInfo(info: VideoFrameInfo | null): void {
    if (!this.#videoInfo) {
      return;
    }

    if (!info) {
      this.#videoInfo.textContent = '';
      this.#maxFrames = 0;
      this.#updateFrameSliderRange();
      this.#updateSpecimenEstimate();
      return;
    }

    this.#maxFrames = info.frameCount;
    this.#videoInfo.textContent = `${info.width} × ${info.height} · ${info.frameCount} frames`;
    this.#updateFrameSliderRange();
    this.#updateSpecimenEstimate();
  }

  setRegion(region: Region, emit = true): void {
    this.#suppressRegionEvent = !emit;
    for (const key of ['x', 'y', 'w', 'h'] as const) {
      const input = this.#coordInputs[key];
      if (input) {
        input.value = String(region[key]);
      }
    }
    this.#suppressRegionEvent = false;
    this.#updateSpecimenEstimate();
  }

  setStartFrame(frame: number): void {
    if (this.#frameSlider) {
      this.#frameSlider.value = String(frame);
    }
    this.#updateFrameLabel(frame);
  }

  setLoading(loading: boolean, message = 'Loading video...'): void {
    if (this.#statusEl) {
      this.#statusEl.textContent = loading ? message : '';
      this.#statusEl.classList.toggle('visible', loading);
    }
    if (this.#prepareButton) {
      this.#prepareButton.disabled = loading;
    }
    if (this.#videoSelector) {
      this.#videoSelector.disabled = loading;
    }
  }

  setPreparing(preparing: boolean): void {
    if (this.#prepareButton) {
      this.#prepareButton.disabled = preparing;
      this.#prepareButton.textContent = preparing ? 'Preparing...' : 'Prepare Specimen';
    }
  }

  updateProgress(progress: SpecimenProgress): void {
    if (this.#statusEl) {
      this.#statusEl.textContent = progress.message;
      this.#statusEl.classList.add('visible');
    }
    if (this.#progressBar) {
      this.#progressBar.style.width = `${progress.percent}%`;
    }
  }

  hideProgress(): void {
    if (this.#statusEl) {
      this.#statusEl.classList.remove('visible');
      this.#statusEl.textContent = '';
    }
    if (this.#progressBar) {
      this.#progressBar.style.width = '0%';
    }
  }

  showSpecimenReady(): void {
    this.#specimenReady = true;
    this.#updateSpecimenEstimate();
  }

  clearSpecimenReady(): void {
    this.#specimenReady = false;
    this.#updateSpecimenEstimate();
    this.#clearSpecimenSurvey();
  }

  renderSpecimenSurvey(replicate: SpecimenReplicate): void {
    if (!this.#surveyCanvas || !this.#surveySection) {
      return;
    }

    const canvas = this.#surveyCanvas;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const scale = 4;
    const padding = 4;
    const margin = padding;

    const surveySize = surveyPixelSize(replicate, scale, padding, margin);

    canvas.width = surveySize.width;
    canvas.height = surveySize.height;

    context.fillStyle = 'rgb(24, 24, 28)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    survey(canvas, replicate, 0, 0, scale, null, padding, margin);

    this.#surveySection.classList.add('visible');
  }

  #clearSpecimenSurvey(): void {
    if (!this.#surveySection || !this.#surveyCanvas) {
      return;
    }

    this.#surveySection.classList.remove('visible');
    this.#surveyCanvas.width = 0;
    this.#surveyCanvas.height = 0;
  }

  #buildUI(): void {
    if (!this.#container) {
      return;
    }

    this.#container.innerHTML = `
      <div class="tab-section-title">Noise Laboratory</div>
      <p class="noise-lab-intro">Select a video region and frame range to build a 3D pixel specimen.</p>

      <div class="noise-lab-controls">
        <div class="settings-row">
          <label for="noise-lab-video-select">Video</label>
          <select id="noise-lab-video-select" class="settings-select">
            <option value="">-- Select a video --</option>
          </select>
          <div class="noise-lab-video-info" id="noise-lab-video-info"></div>
        </div>

        <div class="noise-lab-preview-section">
          <label>Region Preview</label>
          <div class="noise-lab-preview-container">
            <canvas id="noise-lab-preview-canvas" class="noise-lab-preview-canvas"></canvas>
          </div>
          <p class="noise-lab-hint">Drag on the preview to select a square region</p>
        </div>

        <div class="noise-lab-coords-grid">
          <div class="settings-row">
            <label for="noise-lab-x">X</label>
            <input id="noise-lab-x" class="settings-input" type="number" min="0" value="0">
          </div>
          <div class="settings-row">
            <label for="noise-lab-y">Y</label>
            <input id="noise-lab-y" class="settings-input" type="number" min="0" value="0">
          </div>
          <div class="settings-row">
            <label for="noise-lab-w">W</label>
            <input id="noise-lab-w" class="settings-input" type="number" min="1" value="64">
          </div>
          <div class="settings-row">
            <label for="noise-lab-h">H</label>
            <input id="noise-lab-h" class="settings-input" type="number" min="1" value="64">
          </div>
        </div>

        <div class="noise-lab-frame-controls">
          <div class="settings-row">
            <label for="noise-lab-frame-slider">Start Frame <span id="noise-lab-frame-label">0</span></label>
            <input id="noise-lab-frame-slider" class="noise-lab-slider" type="range" min="0" max="0" value="0">
          </div>
          <div class="settings-row">
            <label for="noise-lab-frame-count">Frame Count</label>
            <input id="noise-lab-frame-count" class="settings-input" type="number" min="1" value="30">
          </div>
        </div>

        <div class="noise-lab-specimen-estimate" id="noise-lab-specimen-estimate"></div>

        <button id="noise-lab-prepare-btn" class="action-button primary" disabled>Prepare Specimen</button>

        <div class="noise-lab-progress">
          <div class="noise-lab-progress-bar" id="noise-lab-progress-bar"></div>
        </div>
        <div class="noise-lab-status" id="noise-lab-status"></div>

        <div class="noise-lab-survey-section" id="noise-lab-survey-section">
          <label>Specimen Survey</label>
          <div class="noise-lab-survey-container">
            <canvas id="noise-lab-survey-canvas" class="noise-lab-survey-canvas"></canvas>
          </div>
          <p class="noise-lab-hint">Rows: time slices, horizontal slices, vertical slices</p>
        </div>
      </div>
    `;

    this.#videoSelector = this.#container.querySelector('#noise-lab-video-select');
    this.#previewCanvas = this.#container.querySelector('#noise-lab-preview-canvas');
    this.#frameSlider = this.#container.querySelector('#noise-lab-frame-slider');
    this.#frameLabel = this.#container.querySelector('#noise-lab-frame-label');
    this.#frameCountInput = this.#container.querySelector('#noise-lab-frame-count');
    this.#coordInputs.x = this.#container.querySelector('#noise-lab-x');
    this.#coordInputs.y = this.#container.querySelector('#noise-lab-y');
    this.#coordInputs.w = this.#container.querySelector('#noise-lab-w');
    this.#coordInputs.h = this.#container.querySelector('#noise-lab-h');
    this.#prepareButton = this.#container.querySelector('#noise-lab-prepare-btn');
    this.#statusEl = this.#container.querySelector('#noise-lab-status');
    this.#progressBar = this.#container.querySelector('#noise-lab-progress-bar');
    this.#specimenEstimate = this.#container.querySelector('#noise-lab-specimen-estimate');
    this.#surveySection = this.#container.querySelector('#noise-lab-survey-section');
    this.#surveyCanvas = this.#container.querySelector('#noise-lab-survey-canvas');
    this.#videoInfo = this.#container.querySelector('#noise-lab-video-info');

    this.#bindEvents();
  }

  #bindEvents(): void {
    this.#videoSelector?.addEventListener('change', () => {
      const fileId = this.#videoSelector?.value;
      if (fileId) {
        this.#onVideoSelected?.(fileId);
      }
    });

    this.#frameSlider?.addEventListener('input', () => {
      const frame = Number(this.#frameSlider?.value ?? 0);
      this.#updateFrameLabel(frame);
      this.#onFrameChanged?.(frame, false);
    });

    this.#frameSlider?.addEventListener('change', () => {
      const frame = Number(this.#frameSlider?.value ?? 0);
      this.#onFrameChanged?.(frame, true);
    });

    for (const key of ['x', 'y', 'w', 'h'] as const) {
      this.#coordInputs[key]?.addEventListener('input', () => this.#emitRegionFromInputs());
    }

    this.#frameCountInput?.addEventListener('input', () => {
      this.#updatePrepareButtonState();
      this.#updateSpecimenEstimate();
    });

    this.#prepareButton?.addEventListener('click', () => {
      this.#onPrepareSpecimen?.();
    });
  }

  #emitRegionFromInputs(): void {
    if (this.#suppressRegionEvent) {
      return;
    }

    const w = Number(this.#coordInputs.w?.value ?? 0);
    const side = Math.max(1, w);

    const region: Region = {
      x: Number(this.#coordInputs.x?.value ?? 0),
      y: Number(this.#coordInputs.y?.value ?? 0),
      w: side,
      h: side,
    };

    if (this.#coordInputs.h && String(region.h) !== this.#coordInputs.h.value) {
      this.#suppressRegionEvent = true;
      this.#coordInputs.h.value = String(side);
      this.#suppressRegionEvent = false;
    }

    this.#onRegionChanged?.(region);
    this.#updatePrepareButtonState();
    this.#updateSpecimenEstimate();
  }

  #updateFrameSliderRange(): void {
    if (!this.#frameSlider) {
      return;
    }

    const max = Math.max(0, this.#maxFrames - 1);
    this.#frameSlider.max = String(max);
    if (Number(this.#frameSlider.value) > max) {
      this.#frameSlider.value = String(max);
      this.#updateFrameLabel(max);
    }
    this.#updatePrepareButtonState();
  }

  #updateFrameLabel(frame: number): void {
    if (this.#frameLabel) {
      this.#frameLabel.textContent = String(frame);
    }
    this.#updatePrepareButtonState();
  }

  #updateSpecimenEstimate(): void {
    if (!this.#specimenEstimate) {
      return;
    }

    const hasVideo = Boolean(this.#videoSelector?.value);
    if (!hasVideo) {
      this.#specimenEstimate.classList.remove('visible', 'ready');
      this.#specimenEstimate.innerHTML = '';
      return;
    }

    const side = Math.max(1, Number(this.#coordInputs.w?.value ?? 1));
    const frameCount = Math.max(1, Number(this.#frameCountInput?.value ?? 1));
    const memorySize = formatSpecimenMemorySize(side, side, frameCount, 3);
    const readyBadge = this.#specimenReady
      ? '<span class="noise-lab-specimen-badge">Ready</span>'
      : '';

    this.#specimenEstimate.innerHTML = `
      ${readyBadge}
      <span>${side} × ${side} × ${frameCount} × 3 (${memorySize})</span>
    `;
    this.#specimenEstimate.classList.add('visible');
    this.#specimenEstimate.classList.toggle('ready', this.#specimenReady);
  }

  #updatePrepareButtonState(): void {
    if (!this.#prepareButton) {
      return;
    }

    const hasVideo = Boolean(this.#videoSelector?.value);
    const w = Number(this.#coordInputs.w?.value ?? 0);
    const frameCount = Number(this.#frameCountInput?.value ?? 0);
    const startFrame = Number(this.#frameSlider?.value ?? 0);
    const inRange = this.#maxFrames === 0 || startFrame + frameCount <= this.#maxFrames;

    this.#prepareButton.disabled = !hasVideo || w < 1 || frameCount < 1 || !inRange;
  }

  getSpecimenParams(): {region: Region; startFrame: number; frameCount: number} | null {
    const videoId = this.#videoSelector?.value;
    if (!videoId) {
      return null;
    }

    const w = Number(this.#coordInputs.w?.value ?? 0);
    const side = Math.max(1, w);

    return {
      region: {
        x: Number(this.#coordInputs.x?.value ?? 0),
        y: Number(this.#coordInputs.y?.value ?? 0),
        w: side,
        h: side,
      },
      startFrame: Number(this.#frameSlider?.value ?? 0),
      frameCount: Number(this.#frameCountInput?.value ?? 1),
    };
  }

  getSelectedVideoId(): string | null {
    return this.#videoSelector?.value || null;
  }

  #escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  #escapeAttr(text: string): string {
    return text.replace(/"/g, '&quot;');
  }
}
