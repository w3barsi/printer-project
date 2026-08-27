import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@dg/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

const shopButtonVariants = cva(
  "relative inline-flex items-center gap-[0.6rem] rounded-full font-shop-wide text-[0.78rem] font-bold tracking-[0.18em] whitespace-nowrap uppercase transition-all duration-[250ms] ease-out outline-none select-none focus-visible:ring-[3px] focus-visible:ring-(--shop-red)/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-(--shop-red) text-(--shop-white) shadow-[0_0_0_0_oklch(0.62_0.28_27/0)] hover:bg-(--shop-bg) hover:text-(--shop-ink) hover:shadow-[0_0_24px_oklch(0.62_0.28_27/0.5),0_0_60px_oklch(0.62_0.28_27/0.25)]",
        ghost:
          "border border-(--shop-line-2) text-(--shop-ink) hover:border-(--shop-red) hover:text-(--shop-red) hover:shadow-[0_0_20px_oklch(0.62_0.28_27/0.35)]",
        preset:
          "rounded-2xl border border-(--shop-line-2) bg-[#ffe5df] text-sm font-black tracking-normal text-(--shop-red) normal-case hover:bg-white",
      },
      size: {
        default: "px-[1.4rem] py-[0.95rem]",
        sm: "px-5 py-2.5",
        preset: "px-4 py-3",
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
  render,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> &
  VariantProps<typeof shopButtonVariants> & {
    render?: useRender.ComponentProps<"button">["render"];
  }) {
  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(shopButtonVariants({ variant, size, className })),
      },
      props,
    ),
    render,
    state: {
      slot: "shop-button",
      variant,
      size,
    },
  });
}

export { ShopButton, shopButtonVariants };
