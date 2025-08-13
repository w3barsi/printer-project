import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";

import { CreateDialog } from "@/components/create-jo";
import { Container } from "@/components/layouts/container";
import { SuspenseAuthenticated } from "@/components/suspense-authenticated";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { JoWithItems } from "@/types/convex";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeftIcon, ArrowRightIcon, HashIcon } from "lucide-react";
import { useState } from "react";

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
        <Card>
          <CardContent>
            <div className="w-full">
              <SuspenseAuthenticated fallback={<JobOrderListSkeleton />}>
                <JobOrderList />
              </SuspenseAuthenticated>
            </div>
          </CardContent>
        </Card>
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
    <div className="flex flex-col overflow-hidden rounded">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 font-semibold">
              <HashIcon className="h-4 w-4" />
            </TableHead>
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="hidden font-semibold sm:table-cell">
              Pickup Date
            </TableHead>
            <TableHead className="font-semibold">Contact Number</TableHead>
            <TableHead className="text-right font-semibold">Total Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <JobOrderListBody jos={jos} />
        </TableBody>
      </Table>

      <Separator />
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

  return (
    <>
      {jos.map((jo) => (
        <TableRow
          key={jo._id}
          className=""
          onClick={() => navigate({ to: "/jo/$joId", params: { joId: jo._id } })}
          onMouseDown={(e) => {
            e.preventDefault();
            preloadRoute({ to: "/jo/$joId", params: { joId: jo._id } });
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
          <TableCell className="w-16">{jo.joNumber}</TableCell>
          <TableCell>{jo.name}</TableCell>
          <TableCell className="hidden sm:table-cell">
            {new Date(jo.pickupDate ?? jo._creationTime).toLocaleDateString()}
          </TableCell>
          <TableCell>{jo.contactNumber ? jo.contactNumber : "N/A"}</TableCell>

          <TableCell className="text-right">
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 font-semibold">
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
            <TableHead className="text-right font-semibold">
              <Skeleton className="ml-auto h-4 w-16" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 10 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell className="w-16">
                <Skeleton className="h-4 w-8" />
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
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Separator />
      <div className="flex w-full justify-center gap-2 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
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
