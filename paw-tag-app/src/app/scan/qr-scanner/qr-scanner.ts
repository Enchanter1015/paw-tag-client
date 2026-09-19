import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import jsQR from 'jsqr';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scanner.html',
  styleUrl: './qr-scanner.scss',
})
export class QrScanner implements OnDestroy {
  @Output() readonly scanned = new EventEmitter<string>();
  @Output() readonly cameraError = new EventEmitter<string>();

  @ViewChild('video') private readonly videoRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;

  readonly active = signal(false);

  private stream: MediaStream | null = null;
  private frameHandle: number | null = null;

  async start(): Promise<void> {
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      this.cameraError.emit('Camera access is not available on this device.');
      return;
    }

    try {
      this.stream = await mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch {
      this.cameraError.emit('Camera permission was denied. Enter the animal ID manually instead.');
      return;
    }

    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.cameraError.emit('Camera preview is unavailable.');
      this.stopStream();
      return;
    }

    video.srcObject = this.stream;
    await video.play();
    this.active.set(true);
    this.scanLoop();
  }

  stop(): void {
    if (this.frameHandle !== null) {
      cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
    this.stopStream();
    this.active.set(false);
  }

  ngOnDestroy(): void {
    this.stop();
  }

  /** Resolves a decoded QR payload to an animal id, whether it's a bare id or a profile URL. */
  extractAnimalId(payload: string): string {
    const trimmed = payload.trim();
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split('/').filter(Boolean);
      return segments[segments.length - 1] ?? trimmed;
    } catch {
      return trimmed;
    }
  }

  private scanLoop = (): void => {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      this.frameHandle = requestAnimationFrame(this.scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      this.frameHandle = requestAnimationFrame(this.scanLoop);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const result = jsQR(imageData.data, imageData.width, imageData.height);

    if (result?.data) {
      this.stop();
      this.scanned.emit(this.extractAnimalId(result.data));
      return;
    }

    this.frameHandle = requestAnimationFrame(this.scanLoop);
  };

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }
}
