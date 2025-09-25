import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const statements = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statements);

export const adminRole = ac.newRole({
  ...adminAc.statements,
});

export const basicRole = ac.newRole({
  user: ["create", "list"],
});
