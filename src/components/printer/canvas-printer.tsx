import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import * as reactToPrint from "react-to-print";

import { ItemRenderer } from "@/components/item-render";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function CanvasPrinterComponent({ joId }: { joId: string | null }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const print = reactToPrint.useReactToPrint({
    contentRef: contentRef,
  });
  const reactToPrintFn = () => {
    print();
    setOrNumber(orNumber + 1);
  };
  const [orNumber, setOrNumber] = useState(0);

  const typedId = joId as Id<"jo">;
  const { data: jo } = useQuery(convexQuery(api.jo.getOneComplete, { id: typedId }));

  return (
    <div className="flex w-full items-center justify-center">
      <div className="container flex max-w-md flex-col items-center gap-2 p-2">
        <Link to="/jo">
          <Button variant="link">JobOrder</Button>
        </Link>
        <Button onClick={reactToPrintFn} className="w-full">
          Print
        </Button>
        <div className="inline-block w-fit rounded border bg-blue-200 p-2">
          <div
            ref={contentRef}
            className="flex min-h-24 w-48 flex-col items-center justify-between bg-white"
          >
            <img src="/logo.jpg" className="w-2/3 p-2" />
            <Separator className="bg-black" />
            <div className="flex w-full items-center justify-between p-2">
              <span>{jo?.name}</span>
              <span className="text-center">
                {jo?.joNumber ?? Math.floor(Math.random() * 100)}
              </span>
            </div>
            <Separator className="bg-black" />
            <ItemRenderer item={jo?.items} />
            <Separator className="bg-black" />
            <div className="pb-12 text-center text-sm">
              This serves as your claim slip. Please don't lose this!
            </div>
            <Separator className="bg-black" />
          </div>
        </div>
      </div>
    </div>
  );
}
