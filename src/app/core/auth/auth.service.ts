import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthSession, User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import type { AppRole, UserProfile } from './auth.types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly router = inject(Router);

  private readyResolve: (() => void) | null = null;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.readyResolve = resolve;
  });

  readonly session = signal<AuthSession | null>(null);
  readonly user = signal<User | null>(null);
  readonly userProfile = signal<UserProfile | null>(null);
  readonly roles = signal<AppRole[]>([]);
  readonly organizationActive = signal<boolean | null>(null);
  readonly loading = signal(true);

  readonly isAuthenticated = computed(() => !!this.session());
  readonly currentOrganizationId = computed(() => this.userProfile()?.organization_id ?? null);
  readonly canAccessApp = computed(
    () => this.isAuthenticated() && this.organizationActive() === true,
  );

  constructor() {
    this.initializeAuth();
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  hasRole(role: AppRole): boolean {
    return this.roles().includes(role);
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      await this.loadUserData(data.user.id);
      if (!this.organizationActive()) {
        await this.signOut();
        throw new Error(
          "L'organisation associée à votre compte est inactive. L'accès à l'application est refusé.",
        );
      }
    }

    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string) {
    const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return data;
  }

  async refreshProfile(): Promise<void> {
    const userId = this.user()?.id;
    if (userId) {
      await this.loadUserData(userId);
    }
  }

  private async initializeAuth() {
    try {
      const {
        data: { session },
      } = await this.supabase.auth.getSession();
      await this.handleSessionUpdate(session);

      this.supabase.auth.onAuthStateChange(async (event, currentSession) => {
        await this.handleSessionUpdate(currentSession);

        if (event === 'SIGNED_OUT') {
          this.router.navigate(['/login']);
        } else if (event === 'SIGNED_IN' && this.router.url === '/login' && this.canAccessApp()) {
          this.router.navigate(['/']);
        }
      });
    } catch (error) {
      console.error('Error during auth initialization:', error);
    } finally {
      this.loading.set(false);
      this.readyResolve?.();
    }
  }

  private async handleSessionUpdate(session: AuthSession | null) {
    this.session.set(session);
    this.user.set(session?.user ?? null);

    if (session?.user) {
      await this.loadUserData(session.user.id);
    } else {
      this.userProfile.set(null);
      this.roles.set([]);
      this.organizationActive.set(null);
    }
  }

  private async loadUserData(userId: string, retry = false): Promise<void> {
    try {
      const { data: profileData, error: profileError } = await this.supabase
        .from('users')
        .select('*')
        .eq('uid', userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData?.uid) {
        this.organizationActive.set(null);
        if (!retry) {
          setTimeout(() => this.loadUserData(userId, true), 1000);
        }
        return;
      }

      this.userProfile.set(profileData as UserProfile);

      const organizationId = profileData.organization_id;
      if (!organizationId) {
        this.organizationActive.set(false);
      } else {
        const { data: organization, error: organizationError } = await this.supabase
          .from('organizations')
          .select('is_active')
          .eq('id', organizationId)
          .maybeSingle();

        if (organizationError) {
          throw organizationError;
        }

        this.organizationActive.set(organization?.is_active ?? false);
      }

      const { data: userRolesData, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('roles(name, id)')
        .eq('uid', userId);

      if (rolesError) {
        throw rolesError;
      }

      const roleNames = (userRolesData ?? [])
        .map((row) => row.roles?.name)
        .filter((name): name is AppRole => !!name);

      this.roles.set(roleNames);
    } catch (error) {
      this.organizationActive.set(null);
      console.error('Error loading user profile & roles:', error);
    }
  }
}
