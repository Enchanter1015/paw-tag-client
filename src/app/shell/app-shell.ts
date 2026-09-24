import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AuthStateService } from '../core/services/auth-state.service';
import { PageHeaderService } from '../core/services/page-header.service';
import { TokenStorageService } from '../core/services/token-storage.service';
import { OfflineBanner } from '../shared/offline-banner/offline-banner';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, OfflineBanner],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  protected readonly authState = inject(AuthStateService);
  protected readonly pageHeader = inject(PageHeaderService);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  goBack(): void {
    this.location.back();
  }

  logout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return;
    }
    this.authService.logout({ refreshToken }).subscribe(() => {
      this.router.navigateByUrl('/login');
    });
  }
}
