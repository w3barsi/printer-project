import type { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import type { cashflowType } from "@convex/schema";
import type { FunctionReturnType } from "convex/server";
import type { Infer } from "convex/values";

export type GetOneWithItemsReturnType = FunctionReturnType<typeof api.jo.getOneComplete>;
export type GetOneComplete = NonNullable<
  FunctionReturnType<typeof api.jo.getOneComplete>
>;

export type Item = Doc<"items">;
export type Jo = Doc<"jo">;

export type CashflowType = Infer<typeof cashflowType>;

export type JoWithItems = Jo & {
  items: Item[];
};
