export interface ManagedOrganization {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  is_active: boolean;
}

export interface UpdateOrganizationDto {
  name: string;
  slug: string;
  is_active: boolean;
}
