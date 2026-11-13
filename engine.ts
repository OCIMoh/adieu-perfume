import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================================
   1. CANVAS RENDERER (Cover Math + DPR Cap + AI Watermark Boundary Crop)
   ============================================================================ */
export interface CanvasRendererOptions {
  watermarkCropFactor?: number; // 1.02 subpixel border crop
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private findNearestFrame: (targetIdx: number) => HTMLImageElement | null;
  private activeFrameIndex: number = 0;
  private watermarkCropFactor: number;
  private resizeHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    findNearestFrame: (targetIdx: number) => HTMLImageElement | null,
    options: CanvasRendererOptions = {}
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to obtain 2D canvas context');
    this.ctx = context;
    this.findNearestFrame = findNearestFrame;
    this.watermarkCropFactor = options.watermarkCropFactor ?? 1.02;

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.resize();
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.render();
  }

  public setFrame(index: number): void {
    this.activeFrameIndex = index;
    this.render();
  }

  public render(): void {
    const img = this.findNearestFrame(this.activeFrameIndex);
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // object-fit: cover matrix with clean centering
    const baseScale = Math.max(cw / iw, ch / ih);
    const scale = baseScale * this.watermarkCropFactor;
    const nw = iw * scale;
    const nh = ih * scale;
    const nx = (cw - nw) / 2;
    const ny = (ch - nh) / 2;

    this.ctx.clearRect(0, 0, cw, ch);
    this.ctx.drawImage(img, nx, ny, nw, nh);
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resizeHandler);
  }
}

/* ============================================================================
   2. FRAME PRELOADER (Two-Tier Progressive Infill)
   ============================================================================ */
export type PreloadProgressCallback = (loaded: number, total: number, pct: number) => void;

export interface FramePreloaderOptions {
  totalFrames: number;
  frameUrlResolver?: (index: number) => string;
  onProgress?: PreloadProgressCallback;
  onFirstKeyframe?: () => void;
}

export class FramePreloader {
  public readonly totalFrames: number;
  private images: (HTMLImageElement | null)[];
  private loadedCount: number = 0;
  private frameUrlResolver: (index: number) => string;
  private onProgress?: PreloadProgressCallback;
  private onFirstKeyframe?: () => void;

  constructor(options: FramePreloaderOptions) {
    this.totalFrames = options.totalFrames;
    this.images = new Array(this.totalFrames).fill(null);
    this.onProgress = options.onProgress;
    this.onFirstKeyframe = options.onFirstKeyframe;

    this.frameUrlResolver =
      options.frameUrlResolver ||
      ((index: number) => {
        const pad = String(index + 1).padStart(4, '0');
        const base = (typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL) || './';
        const prefix = base.endsWith('/') ? base : `${base}/`;
        return `${prefix}assets/sequence/frame_${pad}.webp`;
      });
  }

  public getFrame(index: number): HTMLImageElement | null {
    if (index >= 0 && index < this.totalFrames) return this.images[index];
    return null;
  }

  public findNearestLoadedFrame(targetIdx: number): HTMLImageElement | null {
    const direct = this.images[targetIdx];
    if (direct && direct.complete && direct.naturalWidth > 0) return direct;

    for (let offset = 1; offset < this.totalFrames; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0) {
        const imgPrev = this.images[prev];
        if (imgPrev && imgPrev.complete && imgPrev.naturalWidth > 0) return imgPrev;
      }
      const next = targetIdx + offset;
      if (next < this.totalFrames) {
        const imgNext = this.images[next];
        if (imgNext && imgNext.complete && imgNext.naturalWidth > 0) return imgNext;
      }
    }
    return null;
  }

  public startLoading(): void {
    // Tier 1: Frame 0 and stride 4 first (immediate playable 3D scrub in < 1.5s)
    this.loadSingleFrame(0, true);
    for (let i = 0; i < this.totalFrames; i += 4) {
      if (!this.images[i]) this.loadSingleFrame(i, true);
    }

    // Tier 2: Stream remaining frames in background idle time
    const loadTier2 = () => {
      for (let i = 0; i < this.totalFrames; i++) {
        if (!this.images[i]) this.loadSingleFrame(i, false);
      }
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadTier2);
    } else {
      setTimeout(loadTier2, 300);
    }
  }

  private loadSingleFrame(index: number, isPriority: boolean = false): void {
    if (this.images[index]) return;
    const img = new Image();
    this.images[index] = img;

    if ('fetchPriority' in img) {
      (img as any).fetchPriority = isPriority ? 'high' : 'auto';
    }

    img.onload = () => {
      this.loadedCount++;
      const pct = Math.floor((this.loadedCount / this.totalFrames) * 100);
      if (this.onProgress) this.onProgress(this.loadedCount, this.totalFrames, pct);
      if (index === 0 && this.onFirstKeyframe) this.onFirstKeyframe();
    };
    img.onerror = () => {
      this.loadedCount++;
    };
    img.src = this.frameUrlResolver(index);
  }
}

/* ============================================================================
   3. SCROLL MANAGER (Lenis Momentum + GSAP ScrollTrigger + Mobile Physics)
   ============================================================================ */
export interface ScrollManagerOptions {
  totalFrames: number;
  stageElementId?: string;
  scrollDistancePx?: number;
  onFrameUpdate: (frameIndex: number, progress: number) => void;
  onProgressUpdate?: (progress: number) => void;
}

export class ScrollManager {
  public lenis: Lenis;
  private flightTrigger: ScrollTrigger | null = null;
  private totalFrames: number;
  private options: ScrollManagerOptions;

  constructor(options: ScrollManagerOptions) {
    this.options = options;
    this.totalFrames = options.totalFrames;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.lenis = new Lenis({
      duration: prefersReducedMotion ? 0.2 : 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 0.65 // Dampened mobile touch velocity prevents chapter skipping
    });

    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time: number) => {
      this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    this.initScrollTrigger();
    this.bindInternalLinks();
  }

  private initScrollTrigger(): void {
    const stageId = this.options.stageElementId || 'scrollStage';
    const stage = document.getElementById(stageId);
    if (!stage) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scrollDistance = this.options.scrollDistancePx || 4500;

    this.flightTrigger = ScrollTrigger.create({
      id: 'flightTrigger',
      trigger: stage,
      pin: true,
      start: 'top top',
      end: `+=${scrollDistance}`,
      scrub: prefersReducedMotion ? false : 0.1,
      onUpdate: (self) => {
        const frameIdx = Math.min(
          this.totalFrames - 1,
          Math.floor(self.progress * (this.totalFrames - 1))
        );
        this.options.onFrameUpdate(frameIdx, self.progress);
        if (this.options.onProgressUpdate) {
          this.options.onProgressUpdate(self.progress);
        }
      }
    });
  }

  private bindInternalLinks(): void {
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;
        const targetEl = document.querySelector(href);
        if (targetEl) {
          e.preventDefault();
          this.lenis.scrollTo(targetEl as HTMLElement, { duration: 1.2 });
        }
      });
    });
  }

  public destroy(): void {
    if (this.flightTrigger) this.flightTrigger.kill();
    this.lenis.destroy();
  }
}

/* ============================================================================
   4. APP BOOTSTRAP (Unified Entry Point)
   ============================================================================ */
export interface ChapterRange {
  id: string;
  start: number;
  end: number;
}

export interface ScrollWorldAppConfig {
  totalFrames: number;
  scrollDistancePx?: number;
  watermarkCropFactor?: number;
  chapters?: ChapterRange[];
}

export function initScrollWorld(config: ScrollWorldAppConfig): void {
  const canvas = document.getElementById('scrollCanvas') as HTMLCanvasElement;
  const progressBar = document.getElementById('progressBar');
  const scrollHint = document.getElementById('scrollHint');

  if (!canvas) {
    console.error('Canvas element #scrollCanvas not found');
    return;
  }

  const preloader = new FramePreloader({
    totalFrames: config.totalFrames,
    onFirstKeyframe: () => renderer.render(),
    onProgress: (_loaded, _total, pct) => {
      if (pct > 15 && scrollHint) scrollHint.classList.remove('hidden');
    }
  });

  const renderer = new CanvasRenderer(
    canvas,
    (idx) => preloader.findNearestLoadedFrame(idx),
    { watermarkCropFactor: config.watermarkCropFactor ?? 1.02 }
  );

  const chapters = config.chapters || [
    { id: 'chapter-1', start: 0.05, end: 0.28 },
    { id: 'chapter-2', start: 0.32, end: 0.52 },
    { id: 'chapter-3', start: 0.56, end: 0.76 },
    { id: 'chapter-4', start: 0.80, end: 0.98 }
  ];

  new ScrollManager({
    totalFrames: config.totalFrames,
    stageElementId: 'scrollStage',
    scrollDistancePx: config.scrollDistancePx ?? 4500,
    onFrameUpdate: (frameIdx) => renderer.setFrame(frameIdx),
    onProgressUpdate: (progress) => {
      if (progressBar) progressBar.style.width = `${Math.round(progress * 100)}%`;
      if (scrollHint) {
        if (progress > 0.03) scrollHint.classList.add('hidden');
        else scrollHint.classList.remove('hidden');
      }
      const heroIntro = document.getElementById('heroIntro');
      if (heroIntro) {
        if (progress < 0.035) {
          heroIntro.classList.remove('faded');
        } else {
          heroIntro.classList.add('faded');
        }
      }

      const idleStart = document.getElementById('idleStartVideo') as HTMLVideoElement | null;
      const idleEnd = document.getElementById('idleEndVideo') as HTMLVideoElement | null;

      if (idleStart) {
        if (progress <= 0.015) {
          if (!idleStart.classList.contains('active')) {
            idleStart.classList.add('active');
            idleStart.play().catch(() => {});
          }
        } else {
          if (idleStart.classList.contains('active')) {
            idleStart.classList.remove('active');
            idleStart.pause();
          }
        }
      }

      if (idleEnd) {
        if (progress >= 0.982) {
          if (!idleEnd.classList.contains('active')) {
            idleEnd.classList.add('active');
            idleEnd.play().catch(() => {});
          }
        } else {
          if (idleEnd.classList.contains('active')) {
            idleEnd.classList.remove('active');
            idleEnd.pause();
          }
        }
      }
      chapters.forEach((chapter) => {
        const card = document.getElementById(chapter.id);
        if (card) {
          const isActive = progress >= chapter.start && progress <= chapter.end;
          card.classList.toggle('active', isActive);
        }
      });
    }
  });

  preloader.startLoading();
}

