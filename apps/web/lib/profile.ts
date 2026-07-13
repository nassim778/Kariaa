export interface Profile {
  id: string;
  email: string | null;
  is_admin: number;
  created_at?: string;
}

export function isProfileAdmin(p: Profile | null | undefined): boolean {
  return p?.is_admin === 1;
}
