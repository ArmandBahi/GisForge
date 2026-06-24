export type AppRole = 'super_admin' | 'admin_client' | 'user';

export type AppPrivilege = 'users_manage' | 'groups_manage';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  client_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}
