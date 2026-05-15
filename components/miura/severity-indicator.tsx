import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type SeverityLevel = "low" | "medium" | "high";

type SeverityIndicatorProps = {
  level: SeverityLevel;
  label?: string;
  description?: string;
  className?: string;
};

const severityConfig = {
  low: {
    label: "Bajo",
    tone: "Controlado",
    description: "Mantener seguimiento y evidencia.",
    icon: CheckCircle2Icon,
    className:
      "border-severity-low-border bg-severity-low-bg text-severity-low-foreground",
    iconClassName: "text-severity-low",
  },
  medium: {
    label: "Medio",
    tone: "Priorizar",
    description: "Mitigar de forma selectiva.",
    icon: AlertTriangleIcon,
    className:
      "border-severity-medium-border bg-severity-medium-bg text-severity-medium-foreground",
    iconClassName: "text-severity-medium",
  },
  high: {
    label: "Alto",
    tone: "Intervenir",
    description: "Actuar con foco y seguimiento explícito.",
    icon: CircleAlertIcon,
    className:
      "border-severity-high-border bg-severity-high-bg text-severity-high-foreground",
    iconClassName: "text-severity-high",
  },
} satisfies Record<
  SeverityLevel,
  {
    label: string;
    tone: string;
    description: string;
    icon: typeof CheckCircle2Icon;
    className: string;
    iconClassName: string;
  }
>;

function SeverityIndicator({
  level,
  label,
  description,
  className,
}: SeverityIndicatorProps) {
  const config = severityConfig[level];
  const Icon = config.icon;
  const visibleLabel = label ?? config.label;
  const visibleDescription = description ?? config.description;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-lg border p-3 text-sm",
        config.className,
        className,
      )}
      aria-label={`${visibleLabel}: ${config.tone}. ${visibleDescription}`}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 size-4 shrink-0", config.iconClassName)}
      />
      <div className="min-w-0 space-y-1">
        <p className="font-semibold">
          {visibleLabel} · {config.tone}
        </p>
        <p className="leading-5">{visibleDescription}</p>
      </div>
    </div>
  );
}

export { SeverityIndicator, type SeverityLevel };
