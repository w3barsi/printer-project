import { Badge } from "@dg/ui-coss/components/badge";
import { Button } from "@dg/ui-coss/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@dg/ui/components/card";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Container } from "@/components/layouts/container";
import { threeDTools } from "@/lib/3d/tools";

export const Route = createFileRoute("/_authenticated/3d/")({
  component: ThreeDPage,
  loader: () => ({
    crumb: [{ value: "3D", href: "/3d", type: "static" }],
  }),
  head: () => ({
    meta: [{ title: "3D | DG" }],
  }),
});

function ThreeDPage() {
  return (
    <main className="min-h-[calc(100svh-4.1rem)] bg-muted/25">
      <Container className="flex max-w-7xl flex-col gap-8 px-3 py-5 md:px-6 md:py-8">
        <section aria-labelledby="tools-heading" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Design tools
            </p>
            <h1 id="tools-heading" className="text-3xl font-bold tracking-tight">
              3D
            </h1>
            <p className="text-sm text-muted-foreground">
              Purpose-built tools for 3D-printable products. Each tool makes one product.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {threeDTools.map((tool) => (
              <Card key={tool.id} size="sm">
                <CardHeader>
                  <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <tool.icon className="size-5" />
                  </span>
                  <CardTitle>{tool.name}</CardTitle>
                  <CardDescription>{tool.description}</CardDescription>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Open ${tool.name}`}
                      render={<Link to={tool.to} />}
                    >
                      <ArrowRightIcon />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-xs text-muted-foreground">
                  <Badge variant="secondary">Makes: {tool.product}</Badge>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    render={<Link to={tool.to} />}
                  >
                    Open tool
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}
