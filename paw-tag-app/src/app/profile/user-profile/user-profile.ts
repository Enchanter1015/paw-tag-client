import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AnimalsService } from '../../core/services/animals.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { UsersService } from '../../core/services/users.service';
import { Animal, User } from '../../core/models/models';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, PtAvatar, PtButton, PtTag],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly usersService = inject(UsersService);
  private readonly animalsService = inject(AnimalsService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly myAnimals = signal<Animal[]>([]);
  readonly animalsLoading = signal(true);

  readonly roleLabel = (() => {
    const role = this.authState.currentUser?.role;
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : null;
  })();

  constructor() {
    inject(PageHeaderService).set({ title: () => 'Profile', left: { kind: 'none' } });

    const id = this.authState.currentUser?.sub;
    if (!id) {
      this.loading.set(false);
      this.animalsLoading.set(false);
      return;
    }

    this.usersService.getById(id).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Could not load your profile. Please try again.');
        this.loading.set(false);
      },
    });

    // The API has no "animals owned by user" endpoint, so this filters the full search
    // result to animals this account registered (createdBy) — home dogs linked only via
    // the ownership table, not registered by this account, won't appear here.
    this.animalsService.search({}).subscribe({
      next: (animals) => {
        this.myAnimals.set(animals.filter((animal) => animal.createdBy === id));
        this.animalsLoading.set(false);
      },
      error: () => this.animalsLoading.set(false),
    });
  }

  signOut(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return;
    }
    this.authService.logout({ refreshToken }).subscribe(() => {
      this.router.navigateByUrl('/login');
    });
  }
}
