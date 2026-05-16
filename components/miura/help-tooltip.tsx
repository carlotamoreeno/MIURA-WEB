"use client";

import type { ComponentProps, ReactNode } from "react";
import { HelpCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type HelpTooltipProps = {
  title: string;
  description: string;
  children?: ReactNode;
  ariaLabel?: string;
  side?: ComponentProps<typeof TooltipContent>["side"];
  triggerClassName?: string;
  contentClassName?: string;
  testId?: string;
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
}: HelpTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={ariaLabel ?? `Ayuda: ${title}`}
          data-testid={testId}
          className={cn(
            "text-muted-foreground hover:text-foreground",
            triggerClassName,
          )}
        >
          <HelpCircleIcon aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={8}
        className={cn(
          "max-w-sm flex-col items-start whitespace-normal text-left leading-5",
          contentClassName,
        )}
      >
        <span className="font-medium">{title}</span>
        <span>{description}</span>
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

export { HelpTooltip, type HelpTooltipProps };
