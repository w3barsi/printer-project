import type { ToasterProps } from "sonner"
import { Toaster as Sonner } from "sonner"

const getTheme = (key: string, fallback?: string) => {
  if (typeof window === "undefined") return undefined
  let theme: string | undefined
  try {
    theme = localStorage.getItem(key) || undefined
  } catch (e) {
    // Unsupported
  }
  return theme || fallback
}

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = getTheme("theme")

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
