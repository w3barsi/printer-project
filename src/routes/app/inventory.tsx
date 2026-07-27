import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArchiveIcon, ArrowLeftIcon, ArrowRightIcon, BoxesIcon } from "lucide-react";
import { Suspense, useState } from "react";

import { DefaultCatchBoundary } from "@/components/default-catch-boundary";
import {
  InventoryActivityLog,
  InventoryActivityLogSkeleton,
} from "@/components/inventory/activity-log";
import { InventoryItemDetailsSheet } from "@/components/inventory/item-details-sheet";
import {
  AddInventoryItemDialog,
  InventoryItemActions,
  type InventoryListItem,
} from "@/components/inventory/item-dialogs";
import { SupplierManagerDialog } from "@/components/inventory/supplier-manager-dialog";
import { Container } from "@/components/layouts/container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/app/inventory")({
  component: InventoryPage,
  errorComponent: DefaultCatchBoundary,
  loader: async ({ context: { queryClient: qc } }) => {
    await qc.ensureQueryData(
      convexQuery(api.inventory.listItems, {
        paginationOpts: {
          numItems: PAGE_SIZE,
          cursor: null,
        },
      }),
    );

    return {
      crumb: [{ value: "Inventory", href: "/app/inventory", type: "static" }],
    };
  },
  head: () => ({
    meta: [
      {
        title: "Inventory | DG",
      },
    ],
  }),
});

function InventoryPage() {
  return (
    <Container className="flex flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BoxesIcon className="text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A live ledger of materials, supplies, and current stock on hand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SupplierManagerDialog />
          <AddInventoryItemDialog />
        </div>
      </div>

      <Tabs defaultValue="items">
        <TabsList variant="line">
          <TabsTrigger value="items">Stock</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="items">
          <Suspense fallback={<InventoryTableSkeleton />}>
            <InventoryTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="activity">
          <Suspense fallback={<InventoryActivityLogSkeleton />}>
            <InventoryActivityLog />
          </Suspense>
        </TabsContent>
      </Tabs>
    </Container>
  );
}

function InventoryTable() {
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryListItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cursor = cursorHistory.at(-1) ?? null;
  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.inventory.listItems, {
      paginationOpts: {
        numItems: PAGE_SIZE,
        cursor,
      },
    }),
  );

  if (data.page.length === 0 && cursorHistory.length === 0) {
    return (
      <Card>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ArchiveIcon />
              </EmptyMedia>
              <EmptyTitle>No inventory items yet</EmptyTitle>
              <EmptyDescription>
                Add an item to begin tracking stock movements and balances.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  function goToNextPage() {
    if (!data.isDone) {
      setCursorHistory((history) => [...history, data.continueCursor]);
    }
  }

  function goToPreviousPage() {
    setCursorHistory((history) => history.slice(0, -1));
  }

  function showItemDetails(item: InventoryListItem) {
    setDetailsOpen(false);
    setSelectedItem(item);
    requestAnimationFrame(() => setDetailsOpen(true));
  }

  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="border-b py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle>Stock on hand</CardTitle>
              <CardDescription>
                Current quantities grouped by inventory item and supplier.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <TableWrapper className="rounded-none border-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="md:pl-4">Item</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="hidden md:table-cell md:pr-4">
                    Created by
                  </TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.page.map((item) => (
                  <TableRow
                    key={item._id}
                    className="cursor-pointer"
                    onClick={() => showItemDetails(item)}
                  >
                    <TableCell className="md:pl-4">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto justify-start p-0 font-medium"
                        onClick={(event) => {
                          event.stopPropagation();
                          showItemDetails(item);
                        }}
                      >
                        {item.name}
                      </Button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.supplierName}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        {item.quantity.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell md:pr-4">
                      {item.createdByName}
                    </TableCell>
                    <TableCell
                      className="pr-2 text-right"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <InventoryItemActions item={item} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrapper>
        </CardContent>
      </Card>

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

      {selectedItem && (
        <InventoryItemDetailsSheet
          key={selectedItem._id}
          item={selectedItem}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </div>
  );
}

function InventoryTableSkeleton() {
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
