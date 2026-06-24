import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import type { Database } from './database.types';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly _client = this.createClient();

  get client(): SupabaseClient<Database> {
    return this._client;
  }

  private createClient(): SupabaseClient<Database> {
    const { supabaseUrl, supabaseAnonKey } = environment;

    if (!supabaseUrl || !supabaseAnonKey) {
      const missing = [
        ...(!supabaseUrl ? ['supabaseUrl'] : []),
        ...(!supabaseAnonKey ? ['supabaseAnonKey'] : []),
      ];
      throw new Error(`Missing Supabase environment variable(s): ${missing.join(', ')}`);
    }

    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
}
