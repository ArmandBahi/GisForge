export type AppRole = 'super_admin' | 'organization_admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  organization_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}
