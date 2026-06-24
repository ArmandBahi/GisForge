import { inject, Injectable, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { SupabaseService } from '@app/core/supabase/supabase.service';
import type {
  CreateGroupDto,
  ManagedGroup,
  MemberOption,
  OrganizationOption,
  UpdateGroupDto,
} from './groups.types';

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private readonly supabase = inject(SupabaseService).client;
  private readonly auth = inject(AuthService);

  private readonly _groups = signal<ManagedGroup[]>([]);
  private readonly _organizations = signal<OrganizationOption[]>([]);
  private readonly _members = signal<MemberOption[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly groups = this._groups.asReadonly();
  readonly organizations = this._organizations.asReadonly();
  readonly members = this._members.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  resolveOrganizationId(organizationId: string | null): string | null {
    if (this.auth.hasRole('super_admin')) {
      return organizationId;
    }
    return this.auth.userProfile()?.organization_id ?? null;
  }

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      await this.loadOrganizations();

      const [groupsResult, userGroupsResult] = await Promise.all([
        this.supabase.from('groups').select('*').order('created_at', { ascending: false }),
        this.supabase.from('user_groups').select('group_id, uid'),
      ]);

      if (groupsResult.error) {
        throw groupsResult.error;
      }
      if (userGroupsResult.error) {
        throw userGroupsResult.error;
      }

      const memberMap = new Map<string, string[]>();
      for (const row of userGroupsResult.data ?? []) {
        if (!row.group_id || !row.uid) {
          continue;
        }
        const uids = memberMap.get(row.group_id) ?? [];
        uids.push(row.uid);
        memberMap.set(row.group_id, uids);
      }

      const mapped: ManagedGroup[] = (groupsResult.data ?? [])
        .filter((group) => group.id && group.name && group.organization_id)
        .map((group) => {
          const memberUids = memberMap.get(group.id!) ?? [];
          return {
            id: group.id!,
            name: group.name!,
            description: group.description,
            organization_id: group.organization_id!,
            created_at: group.created_at ?? '',
            member_uids: memberUids,
            member_count: memberUids.length,
          };
        });

      this._groups.set(mapped);
    } finally {
      this._loading.set(false);
    }
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

  async loadMembers(organizationId: string | null): Promise<void> {
    const resolvedId = this.resolveOrganizationId(organizationId);
    if (!resolvedId) {
      this._members.set([]);
      return;
    }

    const { data, error } = await this.supabase
      .from('users')
      .select('uid, email, display_name')
      .eq('organization_id', resolvedId)
      .order('email');

    if (error) {
      throw error;
    }

    const options: MemberOption[] = (data ?? [])
      .filter((row) => row.uid && row.email)
      .map((row) => ({
        uid: row.uid!,
        email: row.email!,
        display_name: row.display_name,
      }));

    this._members.set(options);
  }

  async create(dto: CreateGroupDto): Promise<void> {
    this._saving.set(true);
    try {
      const organizationId = this.resolveOrganizationId(dto.organization_id);
      if (!organizationId) {
        throw new Error('Une organisation est requise pour créer un groupe.');
      }

      const { data, error } = await this.supabase
        .from('groups')
        .insert({
          name: dto.name,
          description: dto.description,
          organization_id: organizationId,
        })
        .select('id')
        .single();

      if (error) {
        throw error;
      }

      const groupId = data?.id;
      if (!groupId) {
        throw new Error('Groupe créé mais identifiant introuvable.');
      }

      await this.syncMembers(groupId, dto.member_uids);
      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async update(id: string, dto: UpdateGroupDto): Promise<void> {
    this._saving.set(true);
    try {
      const organizationId = this.resolveOrganizationId(dto.organization_id);
      if (!organizationId) {
        throw new Error('Une organisation est requise.');
      }

      const { error } = await this.supabase
        .from('groups')
        .update({
          name: dto.name,
          description: dto.description,
          organization_id: organizationId,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      await this.syncMembers(id, dto.member_uids);
      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async remove(id: string): Promise<void> {
    this._saving.set(true);
    try {
      const { error } = await this.supabase.from('groups').delete().eq('id', id);

      if (error) {
        throw error;
      }

      await this.load();
    } finally {
      this._saving.set(false);
    }
  }

  async syncMembers(groupId: string, uids: string[]): Promise<void> {
    const { error: deleteError } = await this.supabase.from('user_groups').delete().eq('group_id', groupId);

    if (deleteError) {
      throw deleteError;
    }

    if (uids.length === 0) {
      return;
    }

    const rows = uids.map((uid) => ({ uid, group_id: groupId }));
    const { error: insertError } = await this.supabase.from('user_groups').insert(rows);

    if (insertError) {
      throw insertError;
    }
  }
}
