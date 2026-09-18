import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AuthStateService } from '../core/services/auth-state.service';
import { TokenStorageService } from '../core/services/token-storage.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShell {
  constructor(
    protected readonly authState: AuthStateService,
    private readonly authService: AuthService,
    private readonly tokenStorage: TokenStorageService
  ) {}

  logout(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return;
    }
    this.authService.logout({ refreshToken }).subscribe();
  }
}
