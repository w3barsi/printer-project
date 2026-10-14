import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import { formatPeso } from "@dg/backend/printPricing";
import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dg/ui-coss/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@dg/ui-coss/components/empty";
import { Input } from "@dg/ui-coss/components/input";
import { Skeleton } from "@dg/ui-coss/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dg/ui-coss/components/table";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArchiveIcon, ArrowLeftIcon, ArrowRightIcon, SearchIcon } from "lucide-react";
import { useState } from "react";

import { PricingItemActions } from "@/components/3d/pricing/pricing-item-dialogs";
import { useDebounce } from "@/hooks/use-debounce";

export const PRICING_ITEMS_PAGE_SIZE = 25;

type PricingItemOption = {
  _id: Id<"printPricingItems">;
  name: string;
  latestTotal?: number;
};

function formatPricingDate(value?: number) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function PricingItemsTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const searchQuery = debouncedSearch.trim();
  const isSearching = searchQuery.length > 0;
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.printPricing.items.listItems, {
      paginationOpts: {
        numItems: PRICING_ITEMS_PAGE_SIZE,
        cursor,
      },
    }),
  );
  const searchResults = useQuery({
    ...convexQuery(api.printPricing.items.searchItems, { query: searchQuery }),
    enabled: isSearching,
  });

  function goToNextPage() {
    if (!data.isDone) {
      setCursorHistory((history) => [...history, data.continueCursor]);
    }
  }

  function goToPreviousPage() {
    setCursorHistory((history) => history.slice(0, -1));
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Priced items</CardTitle>
              <CardDescription>
                Each item keeps every saved price as history.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search items..."
                className="pl-9"
                aria-label="Search pricing items"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isSearching ? (
            <PricingItemSearchResults
              query={searchQuery}
              results={searchResults.data}
              isPending={searchResults.isPending}
            />
          ) : data.page.length === 0 ? (
            <div className="p-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ArchiveIcon />
                  </EmptyMedia>
                  <EmptyTitle>No pricing items yet</EmptyTitle>
                  <EmptyDescription>
                    Add an item to price a print and start its price history.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="md:pl-4">Item</TableHead>
                  <TableHead className="text-right">Latest price</TableHead>
                  <TableHead>Last priced</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.page.map((item) => (
                  <TableRow
                    key={item._id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={(event) => {
                      if (
                        event.target instanceof Element &&
                        event.target.closest("a, button")
                      ) {
                        return;
                      }
                      void navigate({
                        to: "/3d/pricing/$itemId",
                        params: { itemId: item._id },
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.target !== event.currentTarget)
                        return;
                      void navigate({
                        to: "/3d/pricing/$itemId",
                        params: { itemId: item._id },
                      });
                    }}
                  >
                    <TableCell className="md:pl-4">
                      <Link
                        to="/3d/pricing/$itemId"
                        params={{ itemId: item._id }}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {item.latestTotal !== undefined ? (
                        <Badge variant="secondary" className="tabular-nums">
                          {formatPeso(item.latestTotal)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Not priced yet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPricingDate(item.latestCalculatedAt)}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatPricingDate(item.updatedAt)}
                    </TableCell>
                    <TableCell className="pr-2 text-right">
                      <PricingItemActions item={item} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!isSearching && data.page.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {data.page.length} item{data.page.length === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || cursorHistory.length === 0}
              onClick={goToPreviousPage}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Previous
            </Button>
            <span className="min-w-6 text-center text-sm text-muted-foreground tabular-nums">
              {cursorHistory.length + 1}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching || data.isDone}
              onClick={goToNextPage}
            >
              Next
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PricingItemSearchResults({
  query,
  results,
  isPending,
}: {
  query: string;
  results: PricingItemOption[] | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-4/5" />
      </div>
    );
  }

  if (!results?.length) {
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">
        No items match &quot;{query}&quot;.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {results.map((item) => (
        <Link
          key={item._id}
          to="/3d/pricing/$itemId"
          params={{ itemId: item._id }}
          className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
        >
          <span className="min-w-0 truncate font-medium">{item.name}</span>
          <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
            {item.latestTotal !== undefined
              ? formatPeso(item.latestTotal)
              : "Not priced yet"}
          </span>
        </Link>
      ))}
    </div>
  );
}

export function PricingItemsTableSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <CardHeader className="border-b py-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-3 items-center gap-4">
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-5 w-28 max-w-full" />
            <Skeleton className="ml-auto h-6 w-12" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
