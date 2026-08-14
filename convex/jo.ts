import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { authedMutation, authedQuery } from "./auth";

const selectableJobOrderStatus = v.union(
  v.literal("pending"),
  v.literal("in-progress"),
  v.literal("completed"),
);

const jobOrderOptionValidator = v.object({
  _id: v.id("jo"),
  joNumber: v.number(),
  name: v.string(),
  status: selectableJobOrderStatus,
});

const selectableJobOrderStatuses = ["pending", "in-progress", "completed"] as const;

async function resolveJobOrderName(ctx: QueryCtx, jobOrder: Doc<"jo">) {
  const customerId = ctx.db.normalizeId("customer", jobOrder.name);
  const customer = customerId ? await ctx.db.get("customer", customerId) : null;
  const name = customer?.name ?? (customerId ? undefined : jobOrder.name);

  return name?.trim() || `Job Order #${jobOrder.joNumber}`;
}

async function toJobOrderOption(ctx: QueryCtx, jobOrder: Doc<"jo">) {
  if (jobOrder.status === "unconfirmed") {
    throw new Error("Unconfirmed Job Orders are not selectable");
  }

  return {
    _id: jobOrder._id,
    joNumber: jobOrder.joNumber,
    name: await resolveJobOrderName(ctx, jobOrder),
    status: jobOrder.status,
  };
}

export const markForPrinting = authedMutation({
  args: v.object({ joId: v.id("jo") }),
  handler: async (ctx, args) => {
    const jo = await ctx.db.get(args.joId);
    if (!jo) {
      throw new Error("JO not found");
    }

    if (jo.status === "unconfirmed") {
      throw new Error("Confirm online orders before marking them for printing");
    }

    await ctx.db.patch("jo", args.joId, { forPrinting: true });
  },
});

export const unmarkForPrinting = authedMutation({
  args: v.object({ joId: v.id("jo") }),
  handler: async (ctx, args) => {
    await ctx.db.patch("jo", args.joId, { forPrinting: false });
  },
});

export const getForPrinting = authedQuery({
  args: {},
  handler: async (ctx) => {
    const forPrinting = await ctx.db
      .query("jo")
      .withIndex("by_forPrinting", (q) => q.eq("forPrinting", true))
      .collect();

    const completeJosPromise = forPrinting.map(async (jo) => {
      const items = await ctx.db
        .query("items")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .collect();

      const payments = await ctx.db
        .query("payment")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .order("desc")
        .collect();

      const paymentWithNamePromise = payments.map(async (payment) => {
        const user = await ctx.db.get("users", payment.createdBy);
        return { ...payment, createdByName: user?.name ?? "Unknown" };
      });

      const paymentWithName = await Promise.all(paymentWithNamePromise);

      const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const totalOrderValue = items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      return { ...jo, totalPayments, totalOrderValue, items, payments: paymentWithName };
    });

    return await Promise.all(completeJosPromise);
  },
});

export const deleteJo = authedMutation({
  args: v.object({ joId: v.id("jo") }),
  handler: async (ctx, args) => {
    const jo = await ctx.db.get("jo", args.joId);

    // Delete all items
    for await (const payment of ctx.db
      .query("payment")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))) {
      await ctx.db.delete("payment", payment._id);
    }

    // Delete all items
    for await (const payment of ctx.db
      .query("items")
      .withIndex("by_joId", (q) => q.eq("joId", args.joId))) {
      await ctx.db.delete("items", payment._id);
    }

    await ctx.db.delete("jo", args.joId);

    if (jo?.trelloId) {
      await ctx.scheduler.runAfter(0, internal.trello.archiveTrelloCard, {
        cardId: jo.trelloId,
      });
    }
  },
});

export const getOne = internalQuery({
  args: { id: v.id("jo") },
  handler: async (ctx, args) => {
    const jo = await ctx.db.get("jo", args.id);
    return jo;
  },
});

export const createJo = authedMutation({
  args: v.object({
    name: v.string(),
    contactNumber: v.optional(v.string()),
    pickupDate: v.optional(v.number()),
    pickupTime: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const { name, pickupDate, contactNumber, pickupTime } = args;

    const lastJoNumber = await ctx.db
      .query("jo")
      .withIndex("by_joNumber")
      .order("desc")
      .first();
    const joNumber = lastJoNumber ? lastJoNumber.joNumber + 1 : 1;

    const joId = await ctx.db.insert("jo", {
      joNumber,
      name,
      pickupDate,
      pickupTime,
      contactNumber,
      status: "pending",
      createdBy: ctx.user.userId as Id<"users">,
      updatedAt: new Date().getTime(),
    });

    await ctx.scheduler.runAfter(0, internal.trello.createTrelloCard, { joId });
    return joId;
  },
});

export const createRandomJo = internalMutation({
  args: {},
  handler: async (ctx) => {
    const name = generateFakeName();
    const lastJoNumber = await ctx.db
      .query("jo")
      .withIndex("by_joNumber")
      .order("desc")
      .first();
    const joNumber = lastJoNumber ? lastJoNumber.joNumber + 1 : 1;

    const joId = await ctx.db.insert("jo", {
      joNumber,
      name,
      pickupDate: new Date().getTime(),
      status: "pending",
    });
    return joId;
  },
});

export const getRecent = authedQuery({
  args: {},
  handler: async (ctx) => {
    const recent = await ctx.db
      .query("jo")
      .withIndex("by_lastUpdated")
      .order("desc")
      .take(5);
    return recent.map((jo) => ({ id: jo._id, name: jo.name }));
  },
});

export const searchOptions = authedQuery({
  args: {
    query: v.string(),
  },
  returns: v.array(jobOrderOptionValidator),
  handler: async (ctx, args) => {
    const searchQuery = args.query.trim();
    const exactNumber = Number(searchQuery);

    if (searchQuery && Number.isSafeInteger(exactNumber) && exactNumber >= 0) {
      const jobOrder = await ctx.db
        .query("jo")
        .withIndex("by_joNumber", (q) => q.eq("joNumber", exactNumber))
        .unique();

      if (jobOrder?.status !== "unconfirmed") {
        return jobOrder ? [await toJobOrderOption(ctx, jobOrder)] : [];
      }

      return [];
    }

    if (!searchQuery) {
      const selectable = (
        await Promise.all(
          selectableJobOrderStatuses.map((status) =>
            ctx.db
              .query("jo")
              .withIndex("by_status_and_updatedAt", (q) => q.eq("status", status))
              .order("desc")
              .take(20),
          ),
        )
      )
        .flat()
        .sort(
          (a, b) => (b.updatedAt ?? b._creationTime) - (a.updatedAt ?? a._creationTime),
        )
        .slice(0, 20);

      return await Promise.all(
        selectable.map((jobOrder) => toJobOrderOption(ctx, jobOrder)),
      );
    }

    const [directNameMatchesByStatus, customers] = await Promise.all([
      Promise.all(
        selectableJobOrderStatuses.map((status) =>
          ctx.db
            .query("jo")
            .withSearchIndex("search_name", (q) =>
              q.search("name", searchQuery).eq("status", status),
            )
            .take(20),
        ),
      ),
      ctx.db
        .query("customer")
        .withSearchIndex("search_name", (q) => q.search("name", searchQuery))
        .take(20),
    ]);
    const customerJobOrders = (
      await Promise.all(
        customers.map((customer) =>
          ctx.db
            .query("jo")
            .withIndex("by_name", (q) => q.eq("name", customer._id))
            .order("desc")
            .take(20),
        ),
      )
    ).flat();
    const byId = new Map<Id<"jo">, Doc<"jo">>();

    for (const jobOrder of [...directNameMatchesByStatus.flat(), ...customerJobOrders]) {
      if (jobOrder.status !== "unconfirmed") byId.set(jobOrder._id, jobOrder);
    }

    const matches = [...byId.values()].slice(0, 20);

    return await Promise.all(matches.map((jobOrder) => toJobOrderOption(ctx, jobOrder)));
  },
});

export const getWithPagination = authedQuery({
  args: v.object({ paginationOptions: paginationOptsValidator }),
  handler: async (ctx, { paginationOptions: { cursor, numItems } }) => {
    const res = await ctx.db
      .query("jo")
      .withIndex("by_lastUpdated")
      .order("desc")
      .paginate({ cursor, numItems });
    const { page, isDone, continueCursor } = res;

    const joWithItems = page.map(async (jo) => {
      const items = await ctx.db
        .query("items")
        .withIndex("by_joId", (q) => q.eq("joId", jo._id))
        .collect();

      return { ...jo, items };
    });

    const all = await Promise.all(joWithItems);

    return {
      jos: all,
      nextCursor: isDone ? undefined : continueCursor,
    };
  },
});

export const getOneCompleteMutation = authedMutation({
  args: { id: v.id("jo") },
  handler: async (ctx, args) => {
    const jo = await ctx.db
      .query("jo")
      .withIndex("by_id", (q) => q.eq("_id", args.id))
      .first();
    if (!jo) {
      return null;
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_joId", (q) => q.eq("joId", jo._id))
      .collect();

    const payments = await ctx.db
      .query("payment")
      .withIndex("by_joId", (q) => q.eq("joId", jo._id))
      .order("desc")
      .collect();

    const paymentWithNamePromise = payments.map(async (payment) => {
      const user = await ctx.db.get("users", payment.createdBy);
      return { ...payment, createdByName: user?.name ?? "Unknown" };
    });

    const paymentWithName = await Promise.all(paymentWithNamePromise);

    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalOrderValue = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    return { ...jo, totalPayments, totalOrderValue, items, payments: paymentWithName };
  },
});

export const getOneComplete = authedQuery({
  args: { id: v.id("jo") },
  handler: async (ctx, args) => {
    const jo = await ctx.db
      .query("jo")
      .withIndex("by_id", (q) => q.eq("_id", args.id))
      .first();
    if (!jo) {
      return null;
    }

    const items = await ctx.db
      .query("items")
      .withIndex("by_joId", (q) => q.eq("joId", jo._id))
      .collect();

    const payments = await ctx.db
      .query("payment")
      .withIndex("by_joId", (q) => q.eq("joId", jo._id))
      .order("desc")
      .collect();

    const paymentWithNamePromise = payments.map(async (payment) => {
      const user = await ctx.db.get("users", payment.createdBy);
      return { ...payment, createdByName: user?.name ?? "Unknown" };
    });

    const paymentWithName = await Promise.all(paymentWithNamePromise);

    const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalOrderValue = items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    return { ...jo, totalPayments, totalOrderValue, items, payments: paymentWithName };
  },
});

function generateFakeName() {
  const firstNames = [
    "Alice",
    "Bob",
    "Charlie",
    "David",
    "Eve",
    "Frank",
    "Grace",
    "Heidi",
  ];
  const lastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
  ];

  const randomFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const randomLastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${randomFirstName} ${randomLastName}`;
}
