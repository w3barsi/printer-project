import { CheckIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

interface DeleteConfirmButtonProps {
  onConfirm: () => Promise<null>;
  onCancel?: () => void;
  isLoading?: boolean;
  deleteFor: "payment" | "job order" | "item" | "cashflow";
}

export function DeleteConfirmButton({
  onConfirm,
  onCancel,
  deleteFor,
}: DeleteConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isConfirming) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsConfirming(false);
        if (onCancel) {
          onCancel();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isConfirming, onCancel]);

  const handleFirstClick = () => {
    setIsConfirming(true);
  };

  const handleSecondClick = async () => {
    if (onConfirm) {
      try {
        await onConfirm();
      } catch (e) {
        toast.error(`Failed to delete ${deleteFor}.`);
      }
    }
    setIsConfirming(false);
  };

  return (
    <div ref={buttonRef}>
      <Button
        className={cn(
          isConfirming &&
            "animate-border-pulse bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/20",
        )}
        type="button"
        variant="ghost"
        size="icon"
        onClick={isConfirming ? handleSecondClick : handleFirstClick}
        aria-label={isConfirming ? "Confirm delete" : "Delete"}
      >
        <div className="relative">
          <Trash2Icon
            className={cn(
              "absolute h-5 w-5 text-black transition-opacity duration-100 dark:text-white",
              isConfirming ? "opacity-0" : "opacity-100",
            )}
          />
          <CheckIcon
            className={cn(
              "h-5 w-5 text-red-600 transition-opacity duration-100 dark:text-red-400",
              isConfirming ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      </Button>
    </div>
  );
}
