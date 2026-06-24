import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { SupabaseService } from '@app/core/supabase/supabase.service';
import type { AppRole } from '@app/core/auth/auth.types';
import type {
  CreateUserDto,
  ManagedUser,
  OrganizationOption,
  RoleOption,
  UpdateUserDto,
} from './users.types';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly _users = signal<ManagedUser[]>([]);
  private readonly _roles = signal<RoleOption[]>([]);
  private readonly _organizations = signal<OrganizationOption[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly users = this._users.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly organizations = this._organizations.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  getAssignableRoles(): AppRole[] {
    if (this.auth.hasRole('super_admin')) {
      return ['user', 'organization_admin', 'super_admin'];
    }
    return ['user', 'organization_admin'];
  }

  resolveOrganizationId(organizationId: string | null): string | null {
    if (this.auth.hasRole('super_admin')) {
      return organizationId;
    }
    return this.auth.userProfile()?.organization_id ?? null;
  }

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      await Promise.all([this.loadRoles(), this.loadOrganizations()]);

      const { data: rawUsers, error: usersError } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        throw usersError;
      }

      const { data: rawUserRoles, error: rolesError } = await this.supabase
        .from('user_roles')
        .select('uid, roles(name)');

      if (rolesError) {
        throw rolesError;
      }

      const mapped: ManagedUser[] = (rawUsers ?? []).map((user) => {
        const roleNames = (rawUserRoles ?? [])
          .filter((row) => row.uid === user.uid)
          .map((row) => row.roles?.name)
          .filter((name): name is AppRole => !!name);

        return {
          uid: user.uid ?? '',
          email: user.email ?? '',
          display_name: user.display_name,
          organization_id: user.organization_id,
          is_active: user.is_active ?? true,
          must_change_password: user.must_change_password ?? false,
          created_at: user.created_at ?? '',
          roles: roleNames,
        };
      });

      this._users.set(mapped);
    } finally {
      this._loading.set(false);
    }
  }

  async loadRoles(): Promise<void> {
    const { data, error } = await this.supabase.from('roles').select('id, name, description').order('name');

    if (error) {
      throw error;
    }

    const options: RoleOption[] = (data ?? [])
      .filter((row) => row.id && row.name)
      .map((row) => ({
        id: row.id!,
        name: row.name as AppRole,
        description: row.description,
      }));

    this._roles.set(options);
  }

  async loadOrganizations(): Promise<void> {
    if (!this.auth.hasRole('super_admin')) {
      this._organizations.set([]);
      return;
    }

    const { data, error } = await this.supabase.from('organizations').select('id, name').order('name');

    if (error) {
      throw error;
    }

    const options: OrganizationOption[] = (data ?? [])
      .filter((row) => row.id && row.name)
      .map((row) => ({
        id: row.id!,
        name: row.name!,
      }));

    this._organizations.set(options);
  }

  async create(dto: CreateUserDto): Promise<void> {
    this._saving.set(true);
    try {
      const organizationId = this.resolveOrganizationId(dto.organization_id);
      if (!organizationId) {
        throw new Error('Une organisation est requise pour créer un utilisateur.');
      }

      const { data: uid, error } = await this.supabase.rpc('create_user', {
        p_email: dto.email,
        p_password: dto.password,
        p_display_name: dto.display_name,
        p_organization_id: organizationId,
        p_is_active: dto.is_active,
        p_must_change_password: dto.must_change_password,
        p_role_names: dto.roles,
      });

      if (error) {
        throw error;
      }

      if (!uid) {
        throw new Error('Utilisateur créé mais identifiant introuvable.');
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async update(uid: string, dto: UpdateUserDto): Promise<void> {
    this._saving.set(true);
    try {
      const updatePayload: {
        display_name: string | null;
        is_active: boolean;
        must_change_password: boolean;
        organization_id?: string | null;
      } = {
        display_name: dto.display_name || null,
        is_active: dto.is_active,
        must_change_password: dto.must_change_password,
      };

      if (this.auth.hasRole('super_admin') && dto.organization_id !== undefined) {
        updatePayload.organization_id = this.resolveOrganizationId(dto.organization_id);
      }

      const { error: userError } = await this.supabase.from('users').update(updatePayload).eq('uid', uid);

      if (userError) {
        throw userError;
      }

      await this.updateUserRoles(uid, dto.roles);

      if (uid === this.auth.user()?.id) {
        await this.auth.refreshProfile();
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async updateUserRoles(uid: string, roleNames: AppRole[]): Promise<void> {
    const roleIds = this._roles()
      .filter((role) => roleNames.includes(role.name))
      .map((role) => role.id);

    const { error: deleteError } = await this.supabase.from('user_roles').delete().eq('uid', uid);

    if (deleteError) {
      throw deleteError;
    }

    if (roleIds.length === 0) {
      return;
    }

    const rows = roleIds.map((roleId) => ({ uid, role_id: roleId }));
    const { error: insertError } = await this.supabase.from('user_roles').insert(rows);

    if (insertError) {
      throw insertError;
    }
  }
}
