/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_users from "../admin/users.js";
import type * as auth from "../auth.js";
import type * as cashier from "../cashier.js";
import type * as drive from "../drive.js";
import type * as http from "../http.js";
import type * as items from "../items.js";
import type * as jo from "../jo.js";
import type * as migrations from "../migrations.js";
import type * as payment from "../payment.js";
import type * as products from "../products.js";
import type * as public_orderHelpers from "../public/orderHelpers.js";
import type * as public_orders from "../public/orders.js";
import type * as public_telegram from "../public/telegram.js";
import type * as public_uploads from "../public/uploads.js";
import type * as r2 from "../r2.js";
import type * as trello from "../trello.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/users": typeof admin_users;
  auth: typeof auth;
  cashier: typeof cashier;
  drive: typeof drive;
  http: typeof http;
  items: typeof items;
  jo: typeof jo;
  migrations: typeof migrations;
  payment: typeof payment;
  products: typeof products;
  "public/orderHelpers": typeof public_orderHelpers;
  "public/orders": typeof public_orders;
  "public/telegram": typeof public_telegram;
  "public/uploads": typeof public_uploads;
  r2: typeof r2;
  trello: typeof trello;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  migrations: import("@convex-dev/migrations/_generated/component.js").ComponentApi<"migrations">;
  r2: import("@convex-dev/r2/_generated/component.js").ComponentApi<"r2">;
};
