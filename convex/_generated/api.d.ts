/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as jo from "../jo.js";
import type * as products from "../products.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  jo: typeof jo;
  products: typeof products;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: {
    lib: {
      create: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                createdAt: number;
                email: string;
                emailVerified: boolean;
                image?: string;
                name: string;
                table: string;
                twoFactorEnabled?: boolean;
                updatedAt: number;
                userId: string;
              }
            | {
                createdAt: number;
                expiresAt: number;
                ipAddress?: string;
                table: string;
                token: string;
                updatedAt: number;
                userAgent?: string;
                userId: string;
              }
            | {
                accessToken?: string;
                accessTokenExpiresAt?: number;
                accountId: string;
                createdAt: number;
                idToken?: string;
                password?: string;
                providerId: string;
                refreshToken?: string;
                refreshTokenExpiresAt?: number;
                scope?: string;
                table: string;
                updatedAt: number;
                userId: string;
              }
            | {
                backupCodes: string;
                secret: string;
                table: string;
                userId: string;
              }
            | {
                createdAt?: number;
                expiresAt: number;
                identifier: string;
                table: string;
                updatedAt?: number;
                value: string;
              }
            | {
                createdAt: number;
                id?: string;
                privateKey: string;
                publicKey: string;
                table: string;
              };
        },
        any
      >;
      deleteAllForUser: FunctionReference<
        "action",
        "internal",
        { table: string; userId: string },
        any
      >;
      deleteAllForUserPage: FunctionReference<
        "mutation",
        "internal",
        {
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
          table: string;
          userId: string;
        },
        any
      >;
      deleteBy: FunctionReference<
        "mutation",
        "internal",
        {
          field: string;
          table: string;
          unique?: boolean;
          value:
            | string
            | number
            | boolean
            | Array<string>
            | Array<number>
            | null;
        },
        any
      >;
      deleteOldVerifications: FunctionReference<
        "action",
        "internal",
        { currentTimestamp: number },
        any
      >;
      deleteOldVerificationsPage: FunctionReference<
        "mutation",
        "internal",
        {
          currentTimestamp: number;
          paginationOpts?: {
            cursor: string | null;
            endCursor?: string | null;
            id?: number;
            maximumBytesRead?: number;
            maximumRowsRead?: number;
            numItems: number;
          };
        },
        any
      >;
      getAccountByAccountIdAndProviderId: FunctionReference<
        "query",
        "internal",
        { accountId: string; providerId: string },
        any
      >;
      getAccountsByUserId: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        any
      >;
      getBy: FunctionReference<
        "query",
        "internal",
        {
          field: string;
          table: string;
          unique?: boolean;
          value:
            | string
            | number
            | boolean
            | Array<string>
            | Array<number>
            | null;
        },
        any
      >;
      getByQuery: FunctionReference<
        "query",
        "internal",
        {
          field: string;
          table: string;
          unique?: boolean;
          value:
            | string
            | number
            | boolean
            | Array<string>
            | Array<number>
            | null;
        },
        any
      >;
      getCurrentSession: FunctionReference<"query", "internal", {}, any>;
      getJwks: FunctionReference<"query", "internal", { limit?: number }, any>;
      listVerificationsByIdentifier: FunctionReference<
        "query",
        "internal",
        {
          identifier: string;
          limit?: number;
          sortBy?: { direction: "asc" | "desc"; field: string };
        },
        any
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          input:
            | {
                table: "account";
                value: Record<string, any>;
                where: {
                  field: string;
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                };
              }
            | {
                table: "session";
                value: Record<string, any>;
                where: {
                  field: string;
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                };
              }
            | {
                table: "verification";
                value: Record<string, any>;
                where: {
                  field: string;
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                };
              }
            | {
                table: "user";
                value: Record<string, any>;
                where: {
                  field: string;
                  value:
                    | string
                    | number
                    | boolean
                    | Array<string>
                    | Array<number>
                    | null;
                };
              };
        },
        any
      >;
      updateTwoFactor: FunctionReference<
        "mutation",
        "internal",
        {
          update: { backupCodes?: string; secret?: string; userId?: string };
          userId: string;
        },
        any
      >;
      updateUserProviderAccounts: FunctionReference<
        "mutation",
        "internal",
        {
          providerId: string;
          update: {
            accessToken?: string;
            accessTokenExpiresAt?: number;
            accountId?: string;
            createdAt?: number;
            idToken?: string;
            password?: string;
            providerId?: string;
            refreshToken?: string;
            refreshTokenExpiresAt?: number;
            scope?: string;
            updatedAt?: number;
            userId?: string;
          };
          userId: string;
        },
        any
      >;
    };
  };
};
