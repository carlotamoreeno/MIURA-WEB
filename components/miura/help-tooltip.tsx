"use client";

import { useId, useState, type ReactNode } from "react";
import { HelpCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type HelpTooltipProps = {
  title: string;
  description: string;
  children?: ReactNode;
  ariaLabel?: string;
  side?: "top" | "right" | "bottom" | "left";
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
  onOpen?: () => void;
};

function HelpTooltip({
  title,
  description,
  children,
  ariaLabel,
  side = "top",
  triggerClassName,
  contentClassName,
  testId,
  onOpen,
}: HelpTooltipProps) {
  const [open, setOpen] = useState(false);
  const generatedTooltipId = useId();
  const tooltipId = `${testId ?? generatedTooltipId}-content`;

  function updateOpen(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      onOpen?.();
    }
  }

  return (
    <span
      className="inline-flex"
      onMouseEnter={() => updateOpen(true)}
      onMouseLeave={() => updateOpen(false)}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-describedby={open ? tooltipId : undefined}
        aria-label={ariaLabel ?? `Ayuda: ${title}`}
        data-testid={testId}
        onBlur={() => updateOpen(false)}
        onClick={() => updateOpen(!open)}
        onFocus={() => updateOpen(true)}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          triggerClassName,
        )}
      >
        <HelpCircleIcon aria-hidden="true" />
      </Button>
      {open ? (
        <span
          id={tooltipId}
          role="tooltip"
          data-side={side}
          data-slot="tooltip-content"
          className={cn(
            "fixed top-20 right-4 left-4 z-50 mx-auto flex w-[min(24rem,calc(100vw-2rem))] flex-col items-start gap-1.5 rounded-md bg-foreground px-3 py-2 text-left text-xs leading-5 text-background shadow-lg",
            contentClassName,
          )}
        >
          <span className="font-medium">{title}</span>
          <span>{description}</span>
          {children}
        </span>
      ) : null}
    </span>
  );
}

export { HelpTooltip, type HelpTooltipProps };
