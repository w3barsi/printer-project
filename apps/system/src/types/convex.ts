import type { api } from "@dg/backend/api";
import type { Doc } from "@dg/backend/dataModel";
import type { cashflowType } from "@dg/backend/schema";
import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";

export type GetOneWithItemsReturnType = FunctionReturnType<typeof api.jo.getOneComplete>;
export type GetOneComplete = NonNullable<
  FunctionReturnType<typeof api.jo.getOneComplete>
>;

export type GetDriveType = FunctionReturnType<typeof api.drive.getDrive>["data"][number];
export type GetDriveParentFolderType = FunctionReturnType<
  typeof api.drive.getDrive
>["parentFolder"];

export type Item = Doc<"items">;
export type Jo = Doc<"jo">;

export type CashflowType = Infer<typeof cashflowType>;

export type GetCashflowQueryType = FunctionReturnType<typeof api.cashier.getCashflow>;

export type JoWithItems = Jo & {
  items: Item[];
};
