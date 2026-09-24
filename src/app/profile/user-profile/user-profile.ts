import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AnimalsService } from '../../core/services/animals.service';
import { AuthService } from '../../core/services/auth.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { OfflineCacheKeys, OfflineCacheService } from '../../core/services/offline-cache.service';
import { OfflineIndicatorService } from '../../core/services/offline-indicator.service';
import { OfflinePrefetchService } from '../../core/services/offline-prefetch.service';
import { PageHeaderService } from '../../core/services/page-header.service';
import { TokenStorageService } from '../../core/services/token-storage.service';
import { UsersService } from '../../core/services/users.service';
import { Animal, ApiError, User } from '../../core/models/models';
import { OfflineNotice } from '../../shared/offline-notice/offline-notice';
import { PtAvatar } from '../../shared/pt-avatar/pt-avatar';
import { PtButton } from '../../shared/pt-button/pt-button';
import { PtTag } from '../../shared/pt-tag/pt-tag';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [RouterLink, OfflineNotice, PtAvatar, PtButton, PtTag],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.scss',
})
export class UserProfile {
  private readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly usersService = inject(UsersService);
  private readonly animalsService = inject(AnimalsService);
  private readonly offlineCache = inject(OfflineCacheService);
  private readonly offlinePrefetch = inject(OfflinePrefetchService);
  private readonly offlineIndicator = inject(OfflineIndicatorService);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly signOutError = signal<string | null>(null);
  // Set when the profile was served from the on-device cache because the network was unreachable.
  readonly cachedAt = signal<string | null>(null);

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

    this.offlineCache.fetch(OfflineCacheKeys.user(id), this.usersService.getById(id)).subscribe({
      next: ({ data: user, fromCache, cachedAt }) => {
        this.user.set(user);
        this.cachedAt.set(fromCache ? cachedAt : null);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(
          this.offlineIndicator.offline()
            ? "You're offline and your profile hasn't been saved on this device yet. Connect to the internet to load it."
            : 'Could not load your profile. Please try again.'
        );
        this.loading.set(false);
      },
    });

    // The API has no "animals owned by user" endpoint, so this filters the full search
    // result to animals this account registered (createdBy) — home dogs linked only via
    // the ownership table, not registered by this account, won't appear here.
    // Only this account's slice is cached (not the whole search result) to keep storage small.
    const myAnimals$ = this.animalsService
      .search({})
      .pipe(map((animals) => animals.filter((animal) => animal.createdBy === id)));
    this.offlineCache.fetch(OfflineCacheKeys.myAnimals(id), myAnimals$).subscribe({
      next: ({ data: animals, fromCache }) => {
        this.myAnimals.set(animals);
        this.animalsLoading.set(false);
        // While online, cache every animal's profile and medical records so they open offline too.
        if (!fromCache) {
          this.offlinePrefetch.prefetchAnimals(animals.map((animal) => animal.id)).subscribe();
        }
      },
      error: () => this.animalsLoading.set(false),
    });
  }

  signOut(): void {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      return;
    }
    this.signOutError.set(null);
    this.authService.logout({ refreshToken }).subscribe({
      next: () => this.router.navigateByUrl('/login'),
      error: (response: HttpErrorResponse) => {
        const apiError = response.error as ApiError | undefined;
        this.signOutError.set(apiError?.error?.message ?? 'Could not sign out. Please try again.');
      },
    });
  }
}
