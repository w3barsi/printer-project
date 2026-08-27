import { Toaster } from "@dg/ui/components/sonner";
import type { ComponentProps } from "react";

import { useTheme } from "@/contexts/theme-context";

export function ThemedToaster(props: ComponentProps<typeof Toaster>) {
  const { theme } = useTheme();

  return <Toaster theme={theme} {...props} />;
}
