import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

const shopButtonVariants = cva(
  "relative inline-flex items-center gap-[0.6rem] rounded-full font-shop-wide text-[0.78rem] font-bold tracking-[0.18em] whitespace-nowrap uppercase transition-all duration-[250ms] ease-out outline-none select-none focus-visible:ring-[3px] focus-visible:ring-(--shop-red)/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-(--shop-red) text-(--shop-white) shadow-[0_0_0_0_oklch(0.62_0.28_27/0)] hover:bg-(--shop-bg) hover:text-(--shop-white) hover:shadow-[0_0_24px_oklch(0.62_0.28_27/0.55),0_0_60px_oklch(0.62_0.28_27/0.3)]",
        ghost:
          "border border-(--shop-line-2) text-(--shop-ink) hover:border-(--shop-red) hover:text-(--shop-red) hover:shadow-[0_0_20px_oklch(0.62_0.28_27/0.35)]",
      },
      size: {
        default: "px-[1.4rem] py-[0.95rem]",
        sm: "px-5 py-2.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

function ShopButton({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof shopButtonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="shop-button"
      data-variant={variant}
      data-size={size}
      className={cn(shopButtonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { ShopButton, shopButtonVariants };
