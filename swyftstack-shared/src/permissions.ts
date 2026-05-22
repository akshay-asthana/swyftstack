// Project/org role permission matrix (architecture §17).
export type Role = "owner" | "admin" | "developer" | "billing" | "viewer";

export type Permission =
  | "project.delete"
  | "app.deploy"
  | "logs.view"
  | "env.manage"
  | "db.create"
  | "db.rotate_password"
  | "billing.manage"
  | "members.invite"
  | "project.view";

const MATRIX: Record<Permission, Role[]> = {
  "project.delete": ["owner"],
  "app.deploy": ["owner", "admin", "developer"],
  "logs.view": ["owner", "admin", "developer", "viewer"],
  "env.manage": ["owner", "admin", "developer"],
  "db.create": ["owner", "admin"],
  "db.rotate_password": ["owner", "admin"],
  "billing.manage": ["owner", "billing"],
  "members.invite": ["owner", "admin"],
  "project.view": ["owner", "admin", "developer", "billing", "viewer"],
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[permission]?.includes(role) ?? false;
}

export function permissionsFor(role: Role): Permission[] {
  return (Object.keys(MATRIX) as Permission[]).filter((p) => can(role, p));
}
