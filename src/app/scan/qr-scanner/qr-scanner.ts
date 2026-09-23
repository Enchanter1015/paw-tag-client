import { Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import jsQR from 'jsqr';

/** Subset of the cordova-plugin-android-permissions API used for the camera runtime permission check. */
interface AndroidPermissions {
  CAMERA: string;
  checkPermission(
    permission: string,
    onSuccess: (status: { hasPermission: boolean }) => void,
    onError: () => void,
  ): void;
  requestPermission(
    permission: string,
    onSuccess: (status: { hasPermission: boolean }) => void,
    onError: () => void,
  ): void;
}

interface CordovaGlobal {
  plugins?: { permissions?: AndroidPermissions };
}

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
  private stopped = false;

  async start(): Promise<void> {
    this.stopped = false;
    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices?.getUserMedia) {
      this.cameraError.emit('Camera access is not available on this device.');
      return;
    }

    if (!(await this.ensureAndroidCameraPermission())) {
      this.cameraError.emit('Camera permission was denied. Enter the animal ID manually instead.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch {
      this.cameraError.emit('Camera permission was denied. Enter the animal ID manually instead.');
      return;
    }
    // stop() may have run (e.g. "Cancel scan") while the permission prompt was open.
    if (this.stopped) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;

    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.cameraError.emit('Camera preview is unavailable.');
      this.stopStream();
      return;
    }

    video.srcObject = this.stream;
    try {
      await video.play();
    } catch {
      this.cameraError.emit('Camera preview is unavailable.');
      this.stopStream();
      return;
    }
    if (this.stopped) {
      return;
    }
    this.active.set(true);
    this.scanLoop();
  }

  stop(): void {
    this.stopped = true;
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

  /**
   * On Android, declaring the CAMERA permission in the manifest is not enough — Cordova's WebView
   * won't surface a permission prompt for getUserMedia() until the app also holds the runtime
   * permission, which cordova-plugin-android-permissions requests explicitly. No-op elsewhere.
   */
  private ensureAndroidCameraPermission(): Promise<boolean> {
    const permissions = (window as unknown as { cordova?: CordovaGlobal }).cordova?.plugins?.permissions;
    if (!permissions) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      permissions.checkPermission(
        permissions.CAMERA,
        (status) => {
          if (status.hasPermission) {
            resolve(true);
            return;
          }
          permissions.requestPermission(
            permissions.CAMERA,
            (requestStatus) => resolve(requestStatus.hasPermission),
            () => resolve(false),
          );
        },
        () => resolve(false),
      );
    });
  }
}
