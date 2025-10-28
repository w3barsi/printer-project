import { Migrations } from "@convex-dev/migrations";

import { components, internal } from "./_generated/api.js";
import { DataModel } from "./_generated/dataModel.js";

export const migrations = new Migrations<DataModel>(components.migrations);
export const runMigrations = migrations.runner(internal.migrations.joOrderedOn);

export const joOrderedOn = migrations.define({
  table: "jo",
  migrateOne: async (ctx, jo) => {
    await ctx.db.patch(jo._id, { orderedOn: jo._creationTime });
  },
});
