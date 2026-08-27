import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

const statements = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statements);

export const adminRole = ac.newRole({
  ...adminAc.statements,
});

const basicStatements = {
  user: ["create", "list"],
} as const;

export const userRole = ac.newRole(basicStatements);
export const cashierRole = ac.newRole(basicStatements);
