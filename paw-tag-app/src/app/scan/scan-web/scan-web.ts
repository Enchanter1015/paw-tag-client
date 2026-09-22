import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtInput } from '../../shared/pt-input/pt-input';
import { QrScanner } from '../qr-scanner/qr-scanner';

@Component({
  selector: 'app-scan-web',
  standalone: true,
  imports: [ReactiveFormsModule, PtButton, PtInput, QrScanner],
  templateUrl: './scan-web.html',
  styleUrl: './scan-web.scss',
})
export class ScanWeb {
  private readonly fb = inject(FormBuilder);
  private readonly animalsService = inject(AnimalsService);
  private readonly router = inject(Router);

  @ViewChild(QrScanner) private readonly qrScanner?: QrScanner;

  readonly form = this.fb.group({
    animalId: this.fb.control('', [Validators.required]),
  });

  constructor() {
    inject(PageHeaderService).set({ title: () => 'Scan a collar', left: { kind: 'none' } });
  }

  readonly cameraOpen = signal(false);
  readonly manualEntryOpen = signal(false);
  readonly resolving = signal(false);
  readonly lookupError = signal<string | null>(null);

  get animalId() {
    return this.form.controls.animalId;
  }

  toggleCamera(): void {
    if (this.cameraOpen()) {
      this.closeCamera();
      return;
    }
    this.lookupError.set(null);
    this.cameraOpen.set(true);
    queueMicrotask(() => this.qrScanner?.start());
  }

  closeCamera(): void {
    this.qrScanner?.stop();
    this.cameraOpen.set(false);
  }

  onScanned(id: string): void {
    this.cameraOpen.set(false);
    this.resolve(id);
  }

  onCameraError(message: string): void {
    this.cameraOpen.set(false);
    this.manualEntryOpen.set(true);
    this.lookupError.set(message);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.resolve(this.form.getRawValue().animalId!.trim());
  }

  retry(): void {
    this.lookupError.set(null);
  }

  private resolve(id: string): void {
    if (!id) {
      return;
    }
    this.lookupError.set(null);
    this.resolving.set(true);

    this.animalsService.getById(id).subscribe({
      next: (animal) => {
        this.resolving.set(false);
        this.router.navigate(['/animals', animal.id]);
      },
      error: () => {
        this.resolving.set(false);
        this.manualEntryOpen.set(true);
        this.lookupError.set(`No animal found for ID "${id}".`);
      },
    });
  }
}
