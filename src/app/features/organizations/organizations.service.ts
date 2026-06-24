import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { SupabaseService } from '@app/core/supabase/supabase.service';
import type {
  CreateOrganizationDto,
  ManagedOrganization,
  UpdateOrganizationDto,
} from './organizations.types';

@Injectable({ providedIn: 'root' })
export class OrganizationsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly _organizations = signal<ManagedOrganization[]>([]);
  private readonly _currentOrganization = signal<ManagedOrganization | null>(null);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly organizations = this._organizations.asReadonly();
  readonly currentOrganization = this._currentOrganization.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) {
        throw error;
      }

      const mapped: ManagedOrganization[] = (data ?? [])
        .filter((row) => row.id && row.name && row.slug)
        .map((row) => ({
          id: row.id!,
          name: row.name!,
          slug: row.slug!,
          is_active: row.is_active ?? true,
          created_at: row.created_at ?? '',
          updated_at: row.updated_at ?? '',
        }));

      this._organizations.set(mapped);
    } finally {
      this._loading.set(false);
    }
  }

  async loadCurrent(): Promise<void> {
    const organizationId = this.auth.currentOrganizationId();
    if (!organizationId) {
      this._currentOrganization.set(null);
      return;
    }

    this._loading.set(true);
    try {
      const { data, error } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data?.id || !data.name || !data.slug) {
        this._currentOrganization.set(null);
        return;
      }

      this._currentOrganization.set({
        id: data.id,
        name: data.name,
        slug: data.slug,
        is_active: data.is_active ?? true,
        created_at: data.created_at ?? '',
        updated_at: data.updated_at ?? '',
      });
    } finally {
      this._loading.set(false);
    }
  }

  async create(dto: CreateOrganizationDto): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase.from('organizations').insert({
        name: dto.name,
        slug: dto.slug,
        is_active: dto.is_active,
      });

      if (error) {
        throw error;
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase
        .from('organizations')
        .update({
          name: dto.name,
          slug: dto.slug,
          is_active: dto.is_active,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase.from('organizations').delete().eq('id', id);

      if (error) {
        throw error;
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }
}
