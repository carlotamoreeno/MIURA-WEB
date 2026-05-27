import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

type LighthouseSummary = {
  route: string;
  profile: string;
  reportPath: string;
  performance: number;
  lcpMs: number;
  fcpMs: number;
  tbtMs: number;
  cls: number;
};

const port = Number(process.env.MIURA_LIGHTHOUSE_PORT ?? 3210);
const externalBaseUrl = process.env.MIURA_LIGHTHOUSE_BASE_URL;
const baseUrl =
  externalBaseUrl?.replace(/\/$/, "") ?? `http://127.0.0.1:${port}`;
const outputDir = path.resolve("test-results/lighthouse-task-028");
const lcpBudgetMs = Number(process.env.MIURA_LIGHTHOUSE_LCP_BUDGET_MS ?? 2500);

const routes = [
  { name: "landing", path: "/" },
  { name: "wizard", path: "/evaluacion/evaluation-demo/wizard" },
] as const;

const lighthouseProfiles = [
  { name: "mobile", args: [] },
  { name: "desktop", args: ["--preset=desktop"] },
] as const;

function runCommand(command: string, args: string[], options = {}) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with ${
            code === null ? `signal ${signal}` : `exit code ${code}`
          }`,
        ),
      );
    });
  });
}

function startServer() {
  return spawn(
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      stdio: "inherit",
    },
  );
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl, { cache: "no-store" });

      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function runLighthouse(
  route: (typeof routes)[number],
  profile: (typeof lighthouseProfiles)[number],
) {
  const reportPath = path.join(outputDir, `${route.name}-${profile.name}.json`);
  const url = `${baseUrl}${route.path}`;

  await runCommand("npx", [
    "--yes",
    "lighthouse@13.3.0",
    url,
    ...profile.args,
    "--only-categories=performance",
    "--output=json",
    `--output-path=${reportPath}`,
    "--chrome-flags=--headless=new --no-sandbox",
    "--quiet",
  ]);

  const report = JSON.parse(await readFile(reportPath, "utf8")) as {
    categories: { performance: { score: number } };
    audits: Record<
      string,
      {
        numericValue: number;
      }
    >;
  };

  return {
    route: route.path,
    profile: profile.name,
    reportPath,
    performance: report.categories.performance.score,
    lcpMs: report.audits["largest-contentful-paint"].numericValue,
    fcpMs: report.audits["first-contentful-paint"].numericValue,
    tbtMs: report.audits["total-blocking-time"].numericValue,
    cls: report.audits["cumulative-layout-shift"].numericValue,
  } satisfies LighthouseSummary;
}

function printSummary(summary: LighthouseSummary) {
  console.log(
    [
      `${summary.route} [${summary.profile}]: performance=${summary.performance.toFixed(2)}`,
      `LCP=${Math.round(summary.lcpMs)}ms`,
      `FCP=${Math.round(summary.fcpMs)}ms`,
      `TBT=${Math.round(summary.tbtMs)}ms`,
      `CLS=${summary.cls}`,
      `report=${path.relative(process.cwd(), summary.reportPath)}`,
    ].join(" | "),
  );
}

async function stopServer(server: ChildProcess | undefined) {
  if (server === undefined || server.killed) return;

  server.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 500));
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  let server: ChildProcess | undefined;

  try {
    if (externalBaseUrl === undefined) {
      await runCommand("npm", ["run", "build"]);
      server = startServer();
      await waitForServer();
    } else {
      console.log(`Using external Lighthouse base URL: ${baseUrl}`);
    }

    const summaries = [];

    for (const route of routes) {
      for (const profile of lighthouseProfiles) {
        const summary = await runLighthouse(route, profile);
        summaries.push(summary);
        printSummary(summary);
      }
    }

    const failures = summaries.filter((summary) => summary.lcpMs > lcpBudgetMs);

    if (failures.length > 0) {
      throw new Error(
        `Lighthouse LCP budget exceeded (${lcpBudgetMs}ms): ${failures
          .map(
            (failure) =>
              `${failure.route} [${failure.profile}]=${Math.round(
                failure.lcpMs,
              )}ms`,
          )
          .join(", ")}`,
      );
    }
  } finally {
    await stopServer(server);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
