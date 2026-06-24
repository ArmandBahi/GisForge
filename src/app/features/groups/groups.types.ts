export interface ManagedGroup {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  created_at: string;
  member_uids: string[];
  member_count: number;
}

export interface OrganizationOption {
  id: string;
  name: string;
}

export interface MemberOption {
  uid: string;
  email: string;
  display_name: string | null;
}

export interface CreateGroupDto {
  name: string;
  description: string | null;
  organization_id: string | null;
  member_uids: string[];
}

export interface UpdateGroupDto {
  name: string;
  description: string | null;
  organization_id: string | null;
  member_uids: string[];
}
