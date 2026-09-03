import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import { Badge } from "@dg/ui/components/badge";
import { Button } from "@dg/ui/components/button";
import { Input } from "@dg/ui/components/input";
import { Skeleton } from "@dg/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableWrapper,
} from "@dg/ui/components/table";
import { cn } from "@dg/ui/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type Row,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpDownIcon,
  HashIcon,
  SearchIcon,
} from "lucide-react";
import { Suspense, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { CreateJoDialog } from "@/components/jo/create-jo";
import { Container } from "@/components/layouts/container";
import type { JoWithItems } from "@/types/convex";

const PAGE_SIZE = 25;

export const Route = createFileRoute("/_authenticated/jo/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      convexQuery(api.jo.getWithPagination, {
        paginationOptions: { numItems: PAGE_SIZE, cursor: null },
      }),
    );
    return {
      crumb: [{ value: "Job Order", href: "/jo/", type: "static" }],
    };
  },

  head: () => ({
    meta: [
      {
        title: `Job Orders | DG`,
      },
    ],
  }),
});

function RouteComponent() {
  return (
    <Container className="flex flex-col gap-2 md:gap-4">
      <Suspense fallback={<JobOrderListSkeleton />}>
        <JobOrderList />
      </Suspense>
    </Container>
  );
}

type CursorHistory = (string | null)[];

function JobOrderList() {
  const [history, setHistory] = useState<CursorHistory>([]);

  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.jo.getWithPagination, {
      paginationOptions: {
        numItems: PAGE_SIZE,
        cursor: history.length > 0 ? history[history.length - 1] : null,
      },
    }),
  );

  const handleNext = () => {
    if (data.nextCursor) {
      const a = data.nextCursor;
      setHistory((prev) => [...prev, a]);
    }
  };

  const handlePrev = () => {
    setHistory((prev) => prev.slice(0, prev.length - 1));
  };

  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <JobOrderDataTable
        jos={data.jos}
        isFetching={isFetching}
        canPrev={history.length > 0}
        canNext={Boolean(data.nextCursor)}
        onPrev={handlePrev}
        onNext={handleNext}
      />
    </div>
  );
}

function getJoTotal(jo: JoWithItems) {
  return jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function joGlobalFilterFn(
  row: Row<JoWithItems>,
  _columnId: string,
  filterValue: unknown,
) {
  const query = String(filterValue ?? "")
    .toLowerCase()
    .trim();
  if (!query) return true;
  const jo = row.original;
  return (
    String(jo.joNumber).toLowerCase().includes(query) ||
    String(jo.name).toLowerCase().includes(query) ||
    (jo.contactNumber?.toLowerCase().includes(query) ?? false)
  );
}

const columns: ColumnDef<JoWithItems>[] = [
  {
    accessorKey: "joNumber",
    enableSorting: true,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-muted-foreground hover:text-foreground"
        aria-label="Sort by job order number"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        <span className="relative">
          <HashIcon className="h-4 w-4" />
          <ArrowUpDownIcon className="absolute -right-1 -bottom-1 size-2" />
        </span>
      </Button>
    ),
    cell: ({ row }) => <span className="tabular-nums">{row.original.joNumber}</span>,
  },
  {
    accessorKey: "name",
    enableSorting: true,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2 text-xs font-semibold text-muted-foreground uppercase hover:text-foreground"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDownIcon className="ml-1 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const jo = row.original;
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{String(jo.name)}</span>
          {jo.status === "unconfirmed" ? (
            <Badge variant="destructive" className="bg-amber-500/10 text-amber-600">
              Unconfirmed
            </Badge>
          ) : null}
          {jo.source === "online-order" ? <Badge variant="outline">Online</Badge> : null}
        </div>
      );
    },
  },
  {
    accessorKey: "pickupDate",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-semibold text-muted-foreground uppercase">
        Pickup Date
      </span>
    ),
    cell: ({ row }) => {
      const pickupDate = row.original.pickupDate;
      return pickupDate ? new Date(pickupDate).toLocaleDateString() : "N/A";
    },
  },
  {
    accessorKey: "pickupTime",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-semibold text-muted-foreground uppercase">
        Pickup Time
      </span>
    ),
    cell: ({ row }) => row.original.pickupTime ?? "N/A",
  },
  {
    accessorKey: "contactNumber",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-semibold text-muted-foreground uppercase">
        Contact Number
      </span>
    ),
    cell: ({ row }) => row.original.contactNumber ?? "N/A",
  },
  {
    id: "totalValue",
    accessorFn: (row) => getJoTotal(row),
    enableSorting: false,
    header: () => (
      <div className="flex justify-end">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Total Value
        </span>
      </div>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{formatCurrency(getJoTotal(row.original))}</span>
    ),
  },
];

// Single source for column widths, shared by the data table and its skeleton
// so columns hold still across pages and while loading. `name` stays flexible
// and absorbs the remaining space; every other column gets an explicit width.
// Requires `table-fixed` on the Table.
function joColumnClassName(columnId: string) {
  switch (columnId) {
    case "joNumber":
      return "w-14 md:pl-4";
    case "pickupDate":
      return "w-32 hidden sm:table-cell";
    case "pickupTime":
      return "w-28 hidden sm:table-cell";
    case "contactNumber":
      return "w-36";
    case "totalValue":
      return "w-32 text-right md:pr-4";
    default:
      return undefined;
  }
}

function JobOrderDataTable({
  jos,
  isFetching,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  jos: JoWithItems[];
  isFetching: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const navigate = Route.useNavigate();
  const { preloadRoute } = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const table = useReactTable({
    data: jos,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: joGlobalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  useHotkeys("1,2,3,4,5,6,7,8,9,0", (_, handler) => {
    const hotkey = Number(handler.hotkey);
    const index = hotkey === 0 ? 9 : hotkey - 1;
    const row = table.getRowModel().rows[index];
    if (row) {
      navigate({ to: "/jo/$joId", params: { joId: row.original._id } });
    }
  });

  const preloadJo = (joId: JoWithItems["_id"]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      preloadRoute({ to: "/jo/$joId", params: { joId } });
    }, 250);
  };

  const cancelPreload = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search job orders..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9"
            aria-label="Search job orders"
          />
        </div>

        <CreateJoDialog />
      </div>

      <TableWrapper>
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(joColumnClassName(header.column.id))}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => {
                const jo = row.original;
                return (
                  <TableRow
                    key={jo._id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({ to: "/jo/$joId", params: { joId: jo._id } })
                    }
                    onMouseEnter={() => preloadJo(jo._id)}
                    onMouseLeave={cancelPreload}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate({ to: "/jo/$joId", params: { joId: jo._id } });
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`View job order details for ${String(jo.name)}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(joColumnClassName(cell.column.id))}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No job orders found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableWrapper>

      <div className="flex w-full justify-center gap-2 pt-2">
        <Button onClick={onPrev} variant="outline" disabled={isFetching || !canPrev}>
          <ArrowLeftIcon /> Prev
        </Button>
        <Button onClick={onNext} variant="outline" disabled={isFetching || !canNext}>
          Next <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}

function JobOrderListSkeleton() {
  return (
    <div className="flex flex-col gap-2 md:gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <SearchIcon className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search job orders..."
            disabled
            className="pl-9"
            aria-label="Search job orders"
          />
        </div>

        <CreateJoDialog />
      </div>
      <TableWrapper>
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className={cn(joColumnClassName("joNumber"))}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="-ml-2 h-8 px-2 text-muted-foreground"
                  aria-hidden
                  tabIndex={-1}
                >
                  <span className="relative">
                    <HashIcon className="h-4 w-4" />
                    <ArrowUpDownIcon className="absolute -right-1 -bottom-1 size-2" />
                  </span>
                </Button>
              </TableHead>
              <TableHead className={cn(joColumnClassName("name"))}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  className="-ml-2 h-8 px-2 text-xs font-semibold text-muted-foreground uppercase"
                  aria-hidden
                  tabIndex={-1}
                >
                  Name
                  <ArrowUpDownIcon className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className={cn(joColumnClassName("pickupDate"))}>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Pickup Date
                </span>
              </TableHead>
              <TableHead className={cn(joColumnClassName("pickupTime"))}>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Pickup Time
                </span>
              </TableHead>
              <TableHead className={cn(joColumnClassName("contactNumber"))}>
                <span className="text-xs font-semibold text-muted-foreground uppercase">
                  Contact Number
                </span>
              </TableHead>
              <TableHead className={cn(joColumnClassName("totalValue"))}>
                <div className="flex justify-end">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    Total Value
                  </span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: PAGE_SIZE }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className={cn(joColumnClassName("joNumber"))}>
                  <Skeleton className="h-5 w-5" />
                </TableCell>
                <TableCell className={cn(joColumnClassName("name"))}>
                  <div className="flex items-center gap-2">
                    <Skeleton
                      className={cn(
                        "h-5",
                        index % 3 === 0 ? "w-40" : index % 3 === 1 ? "w-32" : "w-24",
                      )}
                    />
                    {index % 4 === 0 ? (
                      <Skeleton className="h-5 w-16 rounded-full" />
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className={cn(joColumnClassName("pickupDate"))}>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell className={cn(joColumnClassName("pickupTime"))}>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell className={cn(joColumnClassName("contactNumber"))}>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell className={cn(joColumnClassName("totalValue"))}>
                  <Skeleton className="ml-auto h-5 w-20" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableWrapper>
      <div className="flex w-full justify-center gap-2 pt-2">
        <Button variant="outline" disabled>
          <ArrowLeftIcon /> Prev
        </Button>
        <Button variant="outline" disabled>
          Next <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};
