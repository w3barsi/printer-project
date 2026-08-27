import { convexQuery } from "@convex-dev/react-query";
import { api } from "@dg/backend/api";
import type { Id } from "@dg/backend/dataModel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@dg/ui/components/breadcrumb";
import { useSuspenseQuery } from "@tanstack/react-query";
import { isMatch, Link, useMatches } from "@tanstack/react-router";
import z from "zod";

type CrumbType = {
  value: string;
  href: string;
  type: "static" | "jo";
};

const crumbValidator = z.object({
  value: z.string(),
  href: z.string(),
  type: z.enum(["static", "jo"]),
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
          <BreadcrumbLink render={<Link to={crumb.href} />}>{crumb.value}</BreadcrumbLink>
        </BreadcrumbItem>
      ) : null}

      {crumb.type === "jo" ? <JoCrumb crumb={crumb} /> : null}
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
