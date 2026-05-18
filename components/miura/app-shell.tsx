"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenIcon,
  FileTextIcon,
  GaugeIcon,
  HomeIcon,
  LibraryIcon,
  MessageSquareTextIcon,
  PanelTopIcon,
  PlusCircleIcon,
  RouteIcon,
  SettingsIcon,
  type LucideIcon,
} from "lucide-react";

import {
  getEvaluationProgress,
  getRouteTitle,
  isNavigationItemActive,
  knowledgeNavigation,
  primaryNavigation,
  demoEvaluationId,
  type MiuraNavigationItem,
  type MiuraRouteKey,
} from "@/lib/miura/navigation";
import { getLatestTemporaryEvaluationSession } from "@/lib/miura/session/evaluation-session";
import { MIURA_LOCAL_STORE_EVENT } from "@/lib/miura/session/local-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const navigationIcons = {
  home: HomeIcon,
  newEvaluation: PlusCircleIcon,
  wizard: RouteIcon,
  scorecard: GaugeIcon,
  report: FileTextIcon,
  chat: MessageSquareTextIcon,
  methodology: BookOpenIcon,
  scrumKanban: PanelTopIcon,
  glossary: LibraryIcon,
  localSettings: SettingsIcon,
} satisfies Record<MiuraRouteKey, LucideIcon>;

function NavigationLink({ item }: { item: MiuraNavigationItem }) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isActive = isNavigationItemActive(pathname, item);
  const Icon = navigationIcons[item.key];

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className="h-10"
      >
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
          data-testid={`nav-${item.key}`}
          onClick={() => setOpenMobile(false)}
        >
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function NavigationGroup({
  label,
  items,
}: {
  label: string;
  items: MiuraNavigationItem[];
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavigationLink key={item.key} item={item} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function MiuraAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [activeEvaluationId, setActiveEvaluationId] = useState<string>();
  const progress = getEvaluationProgress(pathname);
  const routeTitle = getRouteTitle(pathname);
  const evaluationNavigation = useMemo(() => {
    const evaluationId = activeEvaluationId ?? demoEvaluationId;

    return primaryNavigation.map((item) => {
      if (item.key === "wizard") {
        return {
          ...item,
          href: `/evaluacion/${evaluationId}/wizard`,
        };
      }

      if (item.key === "scorecard") {
        return {
          ...item,
          href: `/evaluacion/${evaluationId}/scorecard`,
        };
      }

      if (item.key === "report") {
        return {
          ...item,
          href: `/evaluacion/${evaluationId}/informe`,
        };
      }

      return item;
    });
  }, [activeEvaluationId]);

  useEffect(() => {
    function syncActiveEvaluation() {
      setActiveEvaluationId(
        getLatestTemporaryEvaluationSession()?.evaluation.id,
      );
    }

    syncActiveEvaluation();
    window.addEventListener(MIURA_LOCAL_STORE_EVENT, syncActiveEvaluation);
    window.addEventListener("storage", syncActiveEvaluation);

    return () => {
      window.removeEventListener(MIURA_LOCAL_STORE_EVENT, syncActiveEvaluation);
      window.removeEventListener("storage", syncActiveEvaluation);
    };
  }, []);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <a
          href="#contenido"
          className="bg-background text-foreground focus-visible:ring-ring sr-only fixed top-3 left-3 z-50 rounded-md border px-3 py-2 text-sm font-medium shadow-sm focus:not-sr-only focus-visible:ring-2 focus-visible:outline-none"
        >
          Saltar al contenido
        </a>
        <Sidebar collapsible="icon" className="border-sidebar-border">
          <SidebarHeader className="gap-3 p-3">
            <Link
              href="/"
              className="focus-visible:ring-ring flex items-center gap-3 rounded-md p-2 outline-none focus-visible:ring-2"
            >
              <span
                aria-hidden="true"
                className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold"
              >
                M
              </span>
              <span className="min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="block text-sm font-semibold tracking-[0.14em] uppercase">
                  MIURA
                </span>
                <span className="text-sidebar-foreground/70 block truncate text-xs">
                  Demo guiada sin login
                </span>
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <NavigationGroup label="Evaluación" items={evaluationNavigation} />
            <SidebarSeparator />
            <NavigationGroup label="Conocimiento" items={knowledgeNavigation} />
          </SidebarContent>
          <SidebarFooter className="p-3">
            <div className="border-sidebar-border bg-sidebar-accent/45 rounded-md border p-3 group-data-[collapsible=icon]:hidden">
              <p className="text-xs font-medium">MVP 0.1</p>
              <p className="text-sidebar-foreground/75 mt-1 text-xs leading-5">
                Evaluaciones locales, sin cuentas ni persistencia en servidor.
              </p>
            </div>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="bg-background/95 supports-backdrop-filter:bg-background/85 sticky top-0 z-20 border-b backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger
                  aria-label="Alternar navegación principal"
                  data-testid="sidebar-trigger"
                  className="-ml-1"
                />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
                    Navegación MIURA
                  </p>
                  <p className="truncate text-sm font-semibold sm:text-base">
                    {routeTitle}
                  </p>
                </div>
              </div>

              <div className="hidden min-w-[240px] max-w-sm flex-1 items-center gap-3 md:flex">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-muted-foreground truncate text-xs">
                      {progress.label}
                    </span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {progress.step}
                    </span>
                  </div>
                  <Progress
                    value={progress.value}
                    aria-label="Progreso global de evaluación"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="hidden sm:inline-flex">
                  Demo sin login
                </Badge>
                <Button asChild size="sm" variant="outline">
                  <Link href="/chat">
                    <MessageSquareTextIcon />
                    Chat
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <div
            id="contenido"
            className={cn("min-h-[calc(100svh-4rem)] bg-background")}
          >
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

export { MiuraAppShell };
