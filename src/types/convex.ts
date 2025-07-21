import type { api } from "@convex/_generated/api"
import type { Doc } from "@convex/_generated/dataModel"
import type { FunctionReturnType } from "convex/server"

export type GetOneWithItemsReturnType = FunctionReturnType<typeof api.jo.getOneWithItems>
export type GetOneWithItemsReturnTypeNotNull = NonNullable<
  FunctionReturnType<typeof api.jo.getOneWithItems>
>

export type Item = Doc<"items">
export type Jo = Doc<"jo">

export type JoWithItems = {
  jo: Jo
  items: Item[]
}
