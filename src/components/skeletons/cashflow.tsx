import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

export function CashflowSummarySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-6" />
          </CardHeader>
          <Separator />
          <CardContent>
            <Skeleton className="h-7 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CashflowTableSkeleton() {
  return (
    <TableWrapper>
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead className="w-1/11 md:pl-4">Time</TableHead>
            <TableHead className="w-1/11">Type</TableHead>
            <TableHead className="w-4/11">Description</TableHead>
            <TableHead className="w-1/11">Status</TableHead>
            <TableHead className="w-2/11">Received By</TableHead>
            <TableHead className="w-1/11 text-right">Amount</TableHead>
            <TableHead className="w-1/11 text-center md:pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell className="md:pl-4">
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-64" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-32" />
              </TableCell>
              <TableCell className="text-right">
                <Skeleton className="ml-auto h-4 w-24" />
              </TableCell>
              <TableCell className="text-center md:pr-4">
                <Skeleton className="h-4 w-12" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableWrapper>
  );
}
