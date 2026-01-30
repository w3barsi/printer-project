import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isMatch, Link, useMatches } from "@tanstack/react-router";
import z from "zod";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Parent } from "./ui-custom/upload-dropzone";

type CrumbType = {
  value: string;
  href: string;
  type: "static" | "jo" | "drive";
};

const crumbValidator = z.object({
  value: z.string(),
  href: z.string(),
  type: z.enum(["static", "jo", "drive"]),
});
const crumbsValidator = z.array(crumbValidator);

export function MainBreadcrumbs() {
  const matches = useMatches();
  if (matches.some((match) => match.status === "pending")) return null;

  const matchesWithCrumbs = matches
    .filter((match) => isMatch(match, "loaderData.crumb"))
    .map((match) => match.loaderData?.crumb)[0];

  const parsedData = crumbsValidator.safeParse(matchesWithCrumbs);
  if (parsedData.error) return null;

  console.log(parsedData);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {parsedData.data.map((crumb, idx) => (
          <Crumb key={crumb!.href} idx={idx} crumb={crumb} />
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function Crumb({ idx, crumb }: { idx: number; crumb: CrumbType }) {
  return (
    <>
      {idx !== 0 && <BreadcrumbSeparator />}
      {crumb.type === "static" ? (
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={crumb.href}>{crumb.value}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
      ) : null}

      {crumb.type === "jo" ? <JoCrumb crumb={crumb} /> : null}
      {crumb.type === "drive" ? <DriveCrumb crumb={crumb} /> : null}
    </>
  );
}

function DriveCrumb({ crumb }: { crumb: CrumbType }) {
  const parent: Parent = crumb.value ? (crumb.value as Id<"folder">) : "private";
  const { data } = useSuspenseQuery(convexQuery(api.drive.getDrive, { parent }));
  return (
    <>
      <BreadcrumbItem>
        <BreadcrumbPage>{data?.currentFolder?.name}</BreadcrumbPage>
      </BreadcrumbItem>
    </>
  );
}

function JoCrumb({ crumb }: { crumb: CrumbType }) {
  const { data } = useSuspenseQuery(
    convexQuery(api.jo.getOneComplete, { id: crumb.value as Id<"jo"> }),
  );
  return (
    <BreadcrumbItem>
      <BreadcrumbPage>{data?.name}</BreadcrumbPage>
    </BreadcrumbItem>
  );
}
