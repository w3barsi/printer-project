import { cn } from "@/lib/utils"

/**
 * -------------------------------------------------------------------------------------
 * `container mx-auto p-2 md:p-4`.
 * -------------------------------------------------------------------------------------
 */
export function Container({
	children,
	className,
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={cn("container mx-auto p-2 md:p-4", className)}>
			{children}
		</div>
	)
}
