import type { JoWithItems } from "@/types/convex";
import { Suspense, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { ArrowLeftIcon, ArrowRightIcon, HashIcon } from "lucide-react";

import { CreateDialog } from "@/components/create-jo";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/(main)/jo/")({
  component: RouteComponent,
  loader: () => {
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
    <>
      <Container className="flex flex-col gap-2 md:gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Job Orders</h1>
          <CreateDialog />
        </div>

        <Suspense fallback={<JobOrderListSkeleton />}>
          <JobOrderList />
        </Suspense>
      </Container>
    </>
  );
}

type CursorHistory = (string | null)[];

function JobOrderList() {
  const [history, setHistory] = useState<CursorHistory>([]);

  const { data, isFetching } = useSuspenseQuery(
    convexQuery(api.jo.getWithPagination, {
      paginationOptions: {
        numItems: 10,
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

  const jos = data.jos;

  return (
    <div>
      <TableWrapper>
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-16 font-semibold md:pl-4">
                <HashIcon className="h-4 w-4" />
              </TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="hidden font-semibold sm:table-cell">
                Pickup Date
              </TableHead>
              <TableHead className="hidden font-semibold sm:table-cell">
                Pickup Time
              </TableHead>
              <TableHead className="font-semibold">Contact Number</TableHead>
              <TableHead className="text-right font-semibold">Total Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <JobOrderListBody jos={jos} />
          </TableBody>
        </Table>
      </TableWrapper>

      <div className="flex w-full justify-center gap-2 pt-2">
        <Button
          onClick={handlePrev}
          variant="outline"
          disabled={isFetching || history.length === 0}
        >
          <ArrowLeftIcon /> Prev
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={isFetching || !data.nextCursor}
        >
          Next <ArrowRightIcon />
        </Button>
      </div>
    </div>
  );
}

function JobOrderListBody({ jos }: { jos: JoWithItems[] }) {
  const navigate = useNavigate();
  const { preloadRoute } = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <>
      {jos.map((jo) => (
        <TableRow
          key={jo._id}
          className="cursor-pointer"
          onClick={() => navigate({ to: "/jo/$joId", params: { joId: jo._id } })}
          onMouseEnter={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
              preloadRoute({ to: "/jo/$joId", params: { joId: jo._id } });
              console.log("preloading ", jo.name);
            }, 250);
          }}
          onMouseLeave={() => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              navigate({ to: "/jo/$joId", params: { joId: jo._id } });
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={`View job order details for ${jo.name}`}
        >
          <TableCell className="w-16 md:pl-4">{jo.joNumber}</TableCell>
          <TableCell>{jo.name}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {jo.pickupDate ? new Date(jo.pickupDate).toLocaleDateString() : "N/A"}
          </TableCell>

          <TableCell className="hidden sm:table-cell">{jo.pickupTime ?? "N/A"}</TableCell>
          <TableCell>{jo.contactNumber ? jo.contactNumber : "N/A"}</TableCell>

          <TableCell className="text-right md:pr-4">
            {formatCurrency(
              jo.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function JobOrderListSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded">
      <TableWrapper>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16 font-semibold md:pl-4">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead className="font-semibold">
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="hidden font-semibold sm:table-cell">
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead className="font-semibold">
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead className="text-right font-semibold md:pr-4">
                <Skeleton className="ml-auto h-4 w-16" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className="w-16 md:pl-4">
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-28" />
                </TableCell>
                <TableCell className="text-right md:pr-4">
                  <Skeleton className="ml-auto h-4 w-20" />
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
