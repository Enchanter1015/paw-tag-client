import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { QrCodeService } from '../../core/services/qr-code.service';
import { Animal } from '../../core/models/models';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtCard } from '../../shared/pt-card/pt-card';

@Component({
  selector: 'app-animal-qr',
  standalone: true,
  imports: [RouterLink, PtAvatar, PtButton, PtCard],
  templateUrl: './animal-qr.html',
  styleUrl: './animal-qr.scss',
})
export class AnimalQr {
  private readonly route = inject(ActivatedRoute);
  private readonly animalsService = inject(AnimalsService);
  private readonly qrCodeService = inject(QrCodeService);

  readonly animal = signal<Animal | null>(null);
  readonly qrDataUrl = signal<string | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      this.loading.set(false);
      return;
    }

    this.animalsService.getById(id).subscribe({
      next: (animal) => {
        this.animal.set(animal);
        this.loading.set(false);
        this.qrCodeService.generateDataUrl(animal.id).then((dataUrl) => this.qrDataUrl.set(dataUrl));
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  download(): void {
    const animal = this.animal();
    const dataUrl = this.qrDataUrl();
    if (!animal || !dataUrl) {
      return;
    }
    this.qrCodeService.download(dataUrl, animal.id);
  }
}
