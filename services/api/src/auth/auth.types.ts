export type AuthPrincipal = {
  userId: string;
  organizationId: string;
  roleCode: string;
  email: string | null;
  displayName: string;
  status: string;
};
