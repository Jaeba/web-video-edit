import type {Region} from './types.js';

export type RegionChangeCallback = (region: Region) => void;

export class RegionSelector {
  #canvas: HTMLCanvasElement;
  #ctx: CanvasRenderingContext2D;
  #frameImage: ImageBitmap | null = null;
  #videoWidth = 0;
  #videoHeight = 0;
  #region: Region = {x: 0, y: 0, w: 64, h: 64};
  #displayScale = 1;
  #displayOffsetX = 0;
  #displayOffsetY = 0;
  #isDragging = false;
  #dragAnchorVideo = {x: 0, y: 0};
  #onChange: RegionChangeCallback | null = null;
  #rafId: number | null = null;
  #pendingDraw = false;
  #resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.#canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2d context for region selector');
    }
    this.#ctx = ctx;
    this.#bindPointerEvents();
    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#videoWidth > 0) {
        this.#resizeCanvas();
        this.#scheduleDraw();
      }
    });
    if (canvas.parentElement) {
      this.#resizeObserver.observe(canvas.parentElement);
    }
  }

  setChangeCallback(callback: RegionChangeCallback): void {
    this.#onChange = callback;
  }

  setVideoDimensions(width: number, height: number): void {
    this.#videoWidth = width;
    this.#videoHeight = height;
    this.#resizeCanvas();
    this.#clampRegion();
    this.#scheduleDraw();
  }

  setFrame(bitmap: ImageBitmap | null): void {
    this.#frameImage?.close();
    this.#frameImage = bitmap;
    this.#scheduleDraw();
  }

  setRegion(region: Region): void {
    this.#region = {
      x: Math.round(region.x),
      y: Math.round(region.y),
      w: Math.round(region.w),
      h: Math.round(region.h),
    };
    this.#clampRegion();
    this.#scheduleDraw();
  }

  getRegion(): Region {
    return {...this.#region};
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#frameImage?.close();
    this.#frameImage = null;
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
    }
  }

  #bindPointerEvents(): void {
    this.#canvas.addEventListener('pointerdown', this.#onPointerDown);
    this.#canvas.addEventListener('pointermove', this.#onPointerMove);
    this.#canvas.addEventListener('pointerup', this.#onPointerUp);
    this.#canvas.addEventListener('pointerleave', this.#onPointerUp);
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (!this.#frameImage || this.#videoWidth === 0) {
      return;
    }

    this.#canvas.setPointerCapture(event.pointerId);
    this.#isDragging = true;
    this.#dragAnchorVideo = this.#displayToVideo(event.offsetX, event.offsetY);
    this.#region = {x: this.#dragAnchorVideo.x, y: this.#dragAnchorVideo.y, w: 0, h: 0};
    this.#scheduleDraw();
  };

  #onPointerMove = (event: PointerEvent): void => {
    if (!this.#isDragging) {
      return;
    }

    const current = this.#displayToVideo(event.offsetX, event.offsetY);
    const dx = current.x - this.#dragAnchorVideo.x;
    const dy = current.y - this.#dragAnchorVideo.y;
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;

    let x = signX >= 0 ? this.#dragAnchorVideo.x : this.#dragAnchorVideo.x - side;
    let y = signY >= 0 ? this.#dragAnchorVideo.y : this.#dragAnchorVideo.y - side;

    x = Math.max(0, Math.min(x, this.#videoWidth - side));
    y = Math.max(0, Math.min(y, this.#videoHeight - side));
    const clampedSide = Math.min(side, this.#videoWidth - x, this.#videoHeight - y);

    this.#region = {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(clampedSide),
      h: Math.round(clampedSide),
    };
    this.#scheduleDraw();
  };

  #onPointerUp = (): void => {
    if (!this.#isDragging) {
      return;
    }

    this.#isDragging = false;
    this.#clampRegion();
    this.#scheduleDraw();
    this.#onChange?.(this.getRegion());
  };

  #resizeCanvas(): void {
    const container = this.#canvas.parentElement;
    if (!container || this.#videoWidth === 0 || this.#videoHeight === 0) {
      return;
    }

    const maxWidth = container.clientWidth;
    const maxHeight = 280;
    const scale = Math.min(maxWidth / this.#videoWidth, maxHeight / this.#videoHeight, 1);
    const displayWidth = Math.floor(this.#videoWidth * scale);
    const displayHeight = Math.floor(this.#videoHeight * scale);

    this.#displayScale = scale;
    this.#displayOffsetX = 0;
    this.#displayOffsetY = 0;

    const dpr = window.devicePixelRatio || 1;
    this.#canvas.width = displayWidth * dpr;
    this.#canvas.height = displayHeight * dpr;
    this.#canvas.style.width = `${displayWidth}px`;
    this.#canvas.style.height = `${displayHeight}px`;
    this.#ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  #displayToVideo(displayX: number, displayY: number): {x: number; y: number} {
    return {
      x: (displayX - this.#displayOffsetX) / this.#displayScale,
      y: (displayY - this.#displayOffsetY) / this.#displayScale,
    };
  }

  #clampRegion(): void {
    if (this.#videoWidth === 0 || this.#videoHeight === 0) {
      return;
    }

    let {x, y, w, h} = this.#region;
    const side = Math.max(1, Math.min(w, h, this.#videoWidth, this.#videoHeight));
    w = side;
    h = side;
    x = Math.max(0, Math.min(x, this.#videoWidth - side));
    y = Math.max(0, Math.min(y, this.#videoHeight - side));
    this.#region = {x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h)};
  }

  #scheduleDraw(): void {
    if (this.#pendingDraw) {
      return;
    }
    this.#pendingDraw = true;
    this.#rafId = requestAnimationFrame(() => {
      this.#pendingDraw = false;
      this.#draw();
    });
  }

  #draw(): void {
    const displayWidth = this.#canvas.width / (window.devicePixelRatio || 1);
    const displayHeight = this.#canvas.height / (window.devicePixelRatio || 1);

    this.#ctx.clearRect(0, 0, displayWidth, displayHeight);

    if (!this.#frameImage) {
      this.#ctx.fillStyle = 'rgba(30, 30, 35, 0.9)';
      this.#ctx.fillRect(0, 0, displayWidth, displayHeight);
      this.#ctx.fillStyle = 'rgb(150, 158, 171)';
      this.#ctx.font = '13px JupiterSans, Arial, sans-serif';
      this.#ctx.textAlign = 'center';
      this.#ctx.fillText('Select a video to preview', displayWidth / 2, displayHeight / 2);
      return;
    }

    this.#ctx.drawImage(this.#frameImage, 0, 0, displayWidth, displayHeight);

    if (this.#region.w > 0 && this.#region.h > 0) {
      const rx = this.#region.x * this.#displayScale;
      const ry = this.#region.y * this.#displayScale;
      const rw = this.#region.w * this.#displayScale;
      const rh = this.#region.h * this.#displayScale;

      this.#ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      this.#ctx.fillRect(0, 0, displayWidth, ry);
      this.#ctx.fillRect(0, ry, rx, rh);
      this.#ctx.fillRect(rx + rw, ry, displayWidth - rx - rw, rh);
      this.#ctx.fillRect(0, ry + rh, displayWidth, displayHeight - ry - rh);

      this.#ctx.strokeStyle = 'rgb(169, 225, 250)';
      this.#ctx.lineWidth = 2;
      this.#ctx.setLineDash([6, 4]);
      this.#ctx.strokeRect(rx, ry, rw, rh);
      this.#ctx.setLineDash([]);

      this.#ctx.strokeStyle = 'rgba(169, 225, 250, 0.35)';
      this.#ctx.lineWidth = 1;
      const gridStep = Math.max(8, Math.floor(this.#region.w / 8)) * this.#displayScale;
      for (let gx = rx + gridStep; gx < rx + rw; gx += gridStep) {
        this.#ctx.beginPath();
        this.#ctx.moveTo(gx, ry);
        this.#ctx.lineTo(gx, ry + rh);
        this.#ctx.stroke();
      }
      for (let gy = ry + gridStep; gy < ry + rh; gy += gridStep) {
        this.#ctx.beginPath();
        this.#ctx.moveTo(rx, gy);
        this.#ctx.lineTo(rx + rw, gy);
        this.#ctx.stroke();
      }
    }
  }
}
