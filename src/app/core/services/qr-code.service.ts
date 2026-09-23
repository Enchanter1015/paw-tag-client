import { Injectable } from '@angular/core';
import QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  /** Encodes a URL that resolves straight to the animal's profile when scanned by any QR reader. */
  animalProfileUrl(animalId: string): string {
    return `${window.location.origin}/animals/${animalId}`;
  }

  async generateDataUrl(animalId: string): Promise<string> {
    return QRCode.toDataURL(this.animalProfileUrl(animalId), {
      margin: 2,
      width: 320,
      color: { dark: '#1f2937', light: '#ffffff' },
    });
  }

  download(dataUrl: string, animalId: string): void {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `pawtag-${animalId}.png`;
    link.click();
  }
}
