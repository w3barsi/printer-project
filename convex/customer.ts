import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { authedMutation, authedQuery, requireLocalUser } from "./auth";

const MAX_CUSTOMER_NAME_LENGTH = 120;
const MAX_HANDLER_LENGTH = 120;
const MAX_CONTACT_NUMBERS = 10;

function validatePaginationSize(numItems: number) {
  if (!Number.isSafeInteger(numItems) || numItems < 1 || numItems > 50) {
    throw new Error("Page size must be a whole number between 1 and 50");
  }
}

const customerOptionValidator = v.object({
  _id: v.id("customer"),
  name: v.string(),
  handler: v.optional(v.string()),
  contactNumbers: v.optional(v.array(v.string())),
});

function normalizeRequiredText(value: string, label: string, maxLength: number) {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > maxLength) {
    throw new Error(`${label} cannot exceed ${maxLength} characters`);
  }

  return normalized;
}

function normalizeOptionalText(
  value: string | undefined,
  label: string,
  maxLength: number,
) {
  if (value === undefined) return undefined;

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new Error(`${label} cannot exceed ${maxLength} characters`);
  }

  return normalized;
}

export const create = authedMutation({
  args: {
    name: v.string(),
    handler: v.optional(v.string()),
    contactNumbers: v.optional(v.array(v.string())),
  },
  returns: v.id("customer"),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    const name = normalizeRequiredText(
      args.name,
      "Customer name",
      MAX_CUSTOMER_NAME_LENGTH,
    );
    const normalizedName = name.toLocaleLowerCase();
    const handler = normalizeOptionalText(args.handler, "Handler", MAX_HANDLER_LENGTH);
    const contactNumbers = [
      ...new Set(
        args.contactNumbers?.map((number) => number.trim()).filter(Boolean) ?? [],
      ),
    ];

    if (contactNumbers.length > MAX_CONTACT_NUMBERS) {
      throw new Error(`A customer can have up to ${MAX_CONTACT_NUMBERS} contact numbers`);
    }

    const existingCustomer = await ctx.db
      .query("customer")
      .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
      .unique();

    if (existingCustomer) throw new Error("A customer with this name already exists");

    return await ctx.db.insert("customer", {
      name,
      normalizedName,
      ...(handler ? { handler } : {}),
      ...(contactNumbers.length ? { contactNumbers } : {}),
      createdBy: actor._id,
    });
  },
});

export const update = authedMutation({
  args: {
    customerId: v.id("customer"),
    name: v.string(),
    handler: v.optional(v.string()),
    contactNumbers: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    if (actor.role !== "admin") throw new Error("Admin access required");

    const customer = await ctx.db.get("customer", args.customerId);
    if (!customer) throw new Error("Customer not found");

    const name = normalizeRequiredText(
      args.name,
      "Customer name",
      MAX_CUSTOMER_NAME_LENGTH,
    );
    const normalizedName = name.toLocaleLowerCase();
    const handler = normalizeOptionalText(args.handler, "Handler", MAX_HANDLER_LENGTH);
    const contactNumbers = [
      ...new Set(
        args.contactNumbers?.map((number) => number.trim()).filter(Boolean) ?? [],
      ),
    ];

    if (contactNumbers.length > MAX_CONTACT_NUMBERS) {
      throw new Error(`A customer can have up to ${MAX_CONTACT_NUMBERS} contact numbers`);
    }

    const existingCustomer = await ctx.db
      .query("customer")
      .withIndex("by_normalized_name", (q) => q.eq("normalizedName", normalizedName))
      .unique();

    if (existingCustomer && existingCustomer._id !== customer._id) {
      throw new Error("A customer with this name already exists");
    }

    await ctx.db.patch("customer", customer._id, {
      name,
      normalizedName,
      handler,
      contactNumbers: contactNumbers.length ? contactNumbers : undefined,
    });

    return null;
  },
});

export const list = authedQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    if (actor.role !== "admin") throw new Error("Admin access required");
    validatePaginationSize(args.paginationOpts.numItems);

    const result = await ctx.db
      .query("customer")
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (customer) => {
        const creator = await ctx.db.get("users", customer.createdBy);
        return { ...customer, createdByName: creator?.name ?? "Former user" };
      }),
    );

    return { ...result, page };
  },
});

export const get = authedQuery({
  args: { customerId: v.id("customer") },
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    if (actor.role !== "admin") throw new Error("Admin access required");

    const customer = await ctx.db.get("customer", args.customerId);
    if (!customer) return null;

    const creator = await ctx.db.get("users", customer.createdBy);
    return { ...customer, createdByName: creator?.name ?? "Former user" };
  },
});

export const listJobOrders = authedQuery({
  args: {
    customerId: v.id("customer"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requireLocalUser(ctx);
    if (actor.role !== "admin") throw new Error("Admin access required");
    validatePaginationSize(args.paginationOpts.numItems);

    return await ctx.db
      .query("jo")
      .withIndex("by_customer_id", (q) => q.eq("customerId", args.customerId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const searchOptions = authedQuery({
  args: { query: v.string() },
  returns: v.array(customerOptionValidator),
  handler: async (ctx, args) => {
    const query = args.query.trim();
    const customers = query
      ? await ctx.db
          .query("customer")
          .withSearchIndex("search_name", (q) => q.search("name", query))
          .take(20)
      : await ctx.db.query("customer").order("desc").take(20);

    return customers.map(({ _id, name, handler, contactNumbers }) => ({
      _id,
      name,
      handler,
      contactNumbers,
    }));
  },
});
