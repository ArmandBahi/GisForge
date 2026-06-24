import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { SupabaseService } from '@app/core/supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly _saving = signal(false);

  readonly saving = this._saving.asReadonly();

  async updateDisplayName(displayName: string): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase.rpc('update_own_profile', {
        p_display_name: displayName,
      });

      if (error) {
        throw error;
      }

      await this.auth.refreshProfile();
    } finally {
      this._saving.set(false);
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase.auth.updateUser({ password: newPassword });

      if (error) {
        throw error;
      }

      const { error: clearError } = await this.supabase.rpc('clear_must_change_password');

      if (clearError) {
        throw clearError;
      }

      await this.auth.refreshProfile();
    } finally {
      this._saving.set(false);
    }
  }
}
