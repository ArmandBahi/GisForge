import type { AppRole } from '@app/core/auth/auth.types';

export interface ManagedUser {
  uid: string;
  email: string;
  display_name: string | null;
  organization_id: string | null;
  organization_name: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  roles: AppRole[];
}

export interface RoleOption {
  id: string;
  name: AppRole;
  description: string | null;
}

export interface OrganizationOption {
  id: string;
  name: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  display_name: string;
  organization_id: string | null;
  roles: AppRole[];
  is_active: boolean;
  must_change_password: boolean;
}

export interface UpdateUserDto {
  display_name: string;
  organization_id?: string | null;
  roles: AppRole[];
  is_active: boolean;
  must_change_password: boolean;
}

export const ASSIGNABLE_ROLES: AppRole[] = ['user', 'organization_admin', 'super_admin'];
