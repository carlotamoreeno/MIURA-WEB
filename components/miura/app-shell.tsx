import type { ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";
import {
  BookOpenIcon,
  FileTextIcon,
  GaugeIcon,
  HomeIcon,
  LibraryIcon,
  MessageSquareTextIcon,
  PanelLeftIcon,
  PanelTopIcon,
  PlusCircleIcon,
  RouteIcon,
  SettingsIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import {
  demoEvaluationId,
  getEvaluationProgress,
  knowledgeNavigation,
  primaryNavigation,
  type MiuraNavigationItem,
  type MiuraRouteKey,
} from "@/lib/miura/navigation";

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

const routeTitles = {
  home: "Inicio",
  newEvaluation: "Nueva evaluación",
  wizard: "Wizard",
  scorecard: "Scorecard",
  report: "Informe",
  chat: "Pregunta a MIURA",
  methodology: "Metodología",
  scrumKanban: "Scrum/Kanban",
  glossary: "Glosario",
  localSettings: "Ajustes locales",
} satisfies Record<MiuraRouteKey, string>;

const progressByRoute = {
  default: getEvaluationProgress("/"),
  newEvaluation: getEvaluationProgress("/evaluacion/nueva"),
  wizard: getEvaluationProgress(`/evaluacion/${demoEvaluationId}/wizard`),
  scorecard: getEvaluationProgress(`/evaluacion/${demoEvaluationId}/scorecard`),
  report: getEvaluationProgress(`/evaluacion/${demoEvaluationId}/informe`),
} as const;

const shellEnhancementScript = String.raw`
(() => {
  const demoEvaluationId = "evaluation-demo";
  const localStorageKey = "miura.local-export.v1";
  const storeEvent = "miura:local-store-changed";
  const activeClasses = ["bg-sidebar-accent", "text-sidebar-accent-foreground", "font-medium"];
  const inactiveClasses = ["text-sidebar-foreground", "hover:bg-sidebar-accent", "hover:text-sidebar-accent-foreground"];
  const progressByRoute = ${JSON.stringify(progressByRoute)};
  const routeTitles = ${JSON.stringify(routeTitles)};

  function routeKeyFromPath(pathname) {
    if (pathname === "/") return "home";
    if (pathname === "/evaluacion/nueva") return "newEvaluation";
    if (pathname.startsWith("/evaluacion/") && pathname.endsWith("/wizard")) return "wizard";
    if (pathname.startsWith("/evaluacion/") && pathname.endsWith("/scorecard")) return "scorecard";
    if (pathname.startsWith("/evaluacion/") && pathname.endsWith("/informe")) return "report";
    if (pathname === "/chat" || pathname.startsWith("/chat/")) return "chat";
    if (pathname === "/metodologia" || pathname.startsWith("/metodologia/")) return "methodology";
    if (pathname === "/scrum-kanban" || pathname.startsWith("/scrum-kanban/")) return "scrumKanban";
    if (pathname === "/glosario" || pathname.startsWith("/glosario/")) return "glossary";
    if (pathname === "/ajustes-locales" || pathname.startsWith("/ajustes-locales/")) return "localSettings";
    return undefined;
  }

  function latestEvaluationId() {
    try {
      const storedJson = window.localStorage.getItem(localStorageKey);
      if (storedJson === null) return undefined;
      const localExport = JSON.parse(storedJson);
      const evaluations = Array.isArray(localExport?.evaluations)
        ? localExport.evaluations
        : [];

      return evaluations
        .filter((evaluation) => evaluation?.status !== "deleted" && typeof evaluation?.id === "string")
        .sort((left, right) => Date.parse(right.updatedAt ?? "") - Date.parse(left.updatedAt ?? ""))[0]?.id;
    } catch {
      return undefined;
    }
  }

  function updateEvaluationLinks() {
    const evaluationId = latestEvaluationId() || demoEvaluationId;

    document.querySelectorAll("[data-evaluation-route]").forEach((link) => {
      const route = link.getAttribute("data-evaluation-route");
      const segment = route === "report" ? "informe" : route;

      if (segment === "wizard" || segment === "scorecard" || segment === "informe") {
        link.setAttribute("href", "/evaluacion/" + evaluationId + "/" + segment);
      }
    });
  }

  function updateActiveRoute() {
    const activeKey = routeKeyFromPath(window.location.pathname);

    document.querySelectorAll("[data-miura-nav-key]").forEach((link) => {
      const isActive = link.getAttribute("data-miura-nav-key") === activeKey;
      link.classList.remove(...activeClasses, ...inactiveClasses);
      link.classList.add(...(isActive ? activeClasses : inactiveClasses));

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    const title = document.querySelector("[data-miura-route-title]");
    if (title !== null && activeKey !== undefined) {
      title.textContent = routeTitles[activeKey] || "MIURA";
    }

    const progress = progressByRoute[activeKey] || progressByRoute.default;
    const progressLabel = document.querySelector("[data-miura-progress-label]");
    const progressStep = document.querySelector("[data-miura-progress-step]");
    const progressBar = document.querySelector("[data-miura-progress-bar]");
    const progressFill = document.querySelector("[data-miura-progress-fill]");

    if (progressLabel !== null) progressLabel.textContent = progress.label;
    if (progressStep !== null) progressStep.textContent = progress.step;
    if (progressBar !== null) progressBar.setAttribute("aria-valuenow", String(progress.value));
    if (progressFill !== null) progressFill.style.width = progress.value + "%";
  }

  function closeMobileNavigation() {
    const mobileNav = document.querySelector("[data-miura-mobile-nav]");
    const trigger = document.querySelector("[data-testid='sidebar-trigger']");
    const appContent = document.querySelector("[data-miura-app-content]");

    if (mobileNav !== null) mobileNav.classList.add("hidden");
    if (trigger !== null) trigger.setAttribute("aria-expanded", "false");
    if (appContent !== null) {
      appContent.removeAttribute("aria-hidden");
      appContent.removeAttribute("inert");
    }
    document.documentElement.classList.remove("overflow-hidden");
  }

  function openMobileNavigation() {
    const mobileNav = document.querySelector("[data-miura-mobile-nav]");
    const trigger = document.querySelector("[data-testid='sidebar-trigger']");

    if (mobileNav === null) return;

    mobileNav.classList.remove("hidden");
    if (trigger !== null) trigger.setAttribute("aria-expanded", "true");
    const appContent = document.querySelector("[data-miura-app-content]");
    if (appContent !== null) {
      appContent.setAttribute("aria-hidden", "true");
      appContent.setAttribute("inert", "");
    }
    document.documentElement.classList.add("overflow-hidden");
    mobileNav.querySelector("a, button")?.focus();
  }

  function bindMobileNavigation() {
    const trigger = document.querySelector("[data-testid='sidebar-trigger']");

    trigger?.addEventListener("click", () => {
      const mobileNav = document.querySelector("[data-miura-mobile-nav]");
      if (mobileNav?.classList.contains("hidden")) {
        openMobileNavigation();
      } else {
        closeMobileNavigation();
      }
    });

    document.querySelectorAll("[data-miura-mobile-close]").forEach((control) => {
      control.addEventListener("click", closeMobileNavigation);
    });

    document.querySelectorAll("[data-miura-mobile-nav] a").forEach((link) => {
      link.addEventListener("click", closeMobileNavigation);
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobileNavigation();
    });
  }

  function bindRouteChanges() {
    const notifyRouteChanged = () => {
      window.setTimeout(() => {
        updateEvaluationLinks();
        updateActiveRoute();
      }, 0);
    };
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function pushState() {
      const result = originalPushState.apply(this, arguments);
      notifyRouteChanged();
      return result;
    };

    window.history.replaceState = function replaceState() {
      const result = originalReplaceState.apply(this, arguments);
      notifyRouteChanged();
      return result;
    };

    window.addEventListener("popstate", notifyRouteChanged);
  }

  updateEvaluationLinks();
  updateActiveRoute();
  bindMobileNavigation();
  bindRouteChanges();
  window.addEventListener("storage", () => {
    updateEvaluationLinks();
    updateActiveRoute();
  });
  window.addEventListener(storeEvent, () => {
    updateEvaluationLinks();
    updateActiveRoute();
  });
})();
`;

const navigationLinkClass =
  "focus-visible:ring-sidebar-ring flex h-10 items-center gap-2 rounded-md px-2 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2";

function ShellBrand({ mobileClose = false }: { mobileClose?: boolean }) {
  return (
    <Link
      href="/"
      prefetch={false}
      data-miura-mobile-close={mobileClose ? "" : undefined}
      className="focus-visible:ring-ring flex items-center gap-3 rounded-md p-2 outline-none focus-visible:ring-2"
    >
      <span
        aria-hidden="true"
        className="bg-sidebar-primary text-sidebar-primary-foreground grid size-9 shrink-0 place-items-center rounded-md text-sm font-semibold"
      >
        M
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold tracking-[0.14em] uppercase">
          MIURA
        </span>
        <span className="text-sidebar-foreground/70 block truncate text-xs">
          Demo guiada sin login
        </span>
      </span>
    </Link>
  );
}

function NavigationLink({
  item,
  mobileClose = false,
}: {
  item: MiuraNavigationItem;
  mobileClose?: boolean;
}) {
  const Icon = navigationIcons[item.key];
  const evaluationRoute =
    item.key === "wizard" || item.key === "scorecard" || item.key === "report"
      ? item.key
      : undefined;

  return (
    <li>
      <Link
        href={item.href}
        prefetch={false}
        data-miura-nav-key={item.key}
        data-evaluation-route={evaluationRoute}
        data-miura-mobile-close={mobileClose ? "" : undefined}
        data-testid={mobileClose ? undefined : `nav-${item.key}`}
        className={navigationLinkClass}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function NavigationGroup({
  label,
  items,
  mobileClose = false,
}: {
  label: string;
  items: MiuraNavigationItem[];
  mobileClose?: boolean;
}) {
  return (
    <div className="p-2">
      <p className="text-sidebar-foreground/70 flex h-8 items-center px-2 text-xs font-medium">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <NavigationLink
            key={item.key}
            item={item}
            mobileClose={mobileClose}
          />
        ))}
      </ul>
    </div>
  );
}

function ShellNavigation({ mobileClose = false }: { mobileClose?: boolean }) {
  return (
    <nav
      aria-label="Navegación principal MIURA"
      className="flex-1 overflow-y-auto"
    >
      <NavigationGroup
        label="Evaluación"
        items={primaryNavigation}
        mobileClose={mobileClose}
      />
      <div className="bg-sidebar-border mx-4 h-px" />
      <NavigationGroup
        label="Conocimiento"
        items={knowledgeNavigation}
        mobileClose={mobileClose}
      />
    </nav>
  );
}

function ProgressMeter() {
  const progress = progressByRoute.default;

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span
          className="text-muted-foreground truncate text-xs"
          data-miura-progress-label
        >
          {progress.label}
        </span>
        <span
          className="text-muted-foreground shrink-0 text-xs"
          data-miura-progress-step
        >
          {progress.step}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Progreso global de evaluación"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.value}
        className="bg-secondary h-2 overflow-hidden rounded-full"
        data-miura-progress-bar
      >
        <div
          className="bg-primary h-full transition-[width]"
          style={{ width: `${progress.value}%` }}
          data-miura-progress-fill
        />
      </div>
    </div>
  );
}

function MiuraAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <a
        href="#contenido"
        className="bg-background text-foreground focus-visible:ring-ring sr-only fixed top-3 left-3 z-50 rounded-md border px-3 py-2 text-sm font-medium shadow-sm focus:not-sr-only focus-visible:ring-2 focus-visible:outline-none"
      >
        Saltar al contenido
      </a>

      <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground miura-print-hidden fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r md:flex">
        <div className="p-3">
          <ShellBrand />
        </div>
        <ShellNavigation />
        <div className="p-3">
          <div className="border-sidebar-border bg-sidebar-accent/45 rounded-md border p-3">
            <p className="text-xs font-medium">MVP 0.1</p>
            <p className="text-sidebar-foreground/75 mt-1 text-xs leading-5">
              Evaluaciones locales, sin cuentas ni persistencia en servidor.
            </p>
          </div>
        </div>
      </aside>

      <div
        className="miura-print-hidden fixed inset-0 z-40 hidden md:hidden"
        data-miura-mobile-nav
      >
        <button
          type="button"
          aria-label="Cerrar navegación principal"
          className="absolute inset-0 bg-black/35"
          data-miura-mobile-close
        />
        <aside
          id="miura-mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navegación principal MIURA"
          className="border-sidebar-border bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-[18rem] max-w-[calc(100vw-2rem)] flex-col border-r shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 p-3">
            <ShellBrand mobileClose />
            <button
              type="button"
              aria-label="Cerrar navegación principal"
              className="hover:bg-sidebar-accent focus-visible:ring-sidebar-ring inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2"
              data-miura-mobile-close
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          </div>
          <ShellNavigation mobileClose />
        </aside>
      </div>

      <div className="min-w-0 md:pl-64" data-miura-app-content>
        <header className="bg-background/95 supports-backdrop-filter:bg-background/85 miura-print-hidden sticky top-0 z-20 border-b backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Alternar navegación principal"
                aria-expanded="false"
                aria-controls="miura-mobile-navigation"
                data-testid="sidebar-trigger"
                className="hover:bg-accent focus-visible:ring-ring -ml-2 inline-flex size-9 items-center justify-center rounded-md outline-none focus-visible:ring-2 md:hidden"
              >
                <PanelLeftIcon aria-hidden="true" className="size-4" />
              </button>
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.12em] uppercase">
                  Navegación MIURA
                </p>
                <p
                  className="truncate text-sm font-semibold sm:text-base"
                  data-miura-route-title
                >
                  MIURA
                </p>
              </div>
            </div>

            <div className="hidden min-w-[240px] max-w-sm flex-1 items-center gap-3 md:flex">
              <ProgressMeter />
            </div>

            <div className="flex items-center gap-2">
              <span className="border-border text-muted-foreground hidden h-6 items-center rounded-md border px-2 text-xs font-medium sm:inline-flex">
                Demo sin login
              </span>
              <Link
                href="/chat"
                prefetch={false}
                className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium outline-none focus-visible:ring-2"
              >
                <MessageSquareTextIcon aria-hidden="true" className="size-4" />
                Chat
              </Link>
            </div>
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="min-h-[calc(100svh-4rem)] min-w-0 bg-background"
        >
          {children}
        </main>
      </div>

      <Script
        id="miura-shell-enhancement"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{ __html: shellEnhancementScript }}
      />
    </div>
  );
}

export { MiuraAppShell };
