import { beforeEach, describe, expect, test } from "vitest";

import { createDraftMiuraEvaluation } from "@/lib/miura/domain";
import {
  parseMiuraLocalExportJson,
  serializeMiuraLocalExport,
  type Evaluation,
  type MiuraLocalExport,
} from "@/lib/miura/schemas";
import {
  clearMiuraLocalStore,
  latestEvaluationFromLocalExport,
  readMiuraLocalStore,
  replaceMiuraLocalExport,
  updateMiuraLocalEvaluation,
  upsertMiuraLocalExport,
  type MiuraBrowserStorage,
} from "@/lib/miura/session/local-store";

const validFormInput = {
  workspaceName: "Organización demo",
  projectName: "Portal operativo",
  projectDescription: "",
  methodology: "Scrum/Kanban",
  monthlyCapacityHours: "840",
  hourlyCost: "",
  horizonMonths: "12",
};

function createMemoryStorage({
  failRead = false,
  failWrite = false,
  failRemove = false,
}: {
  failRead?: boolean;
  failWrite?: boolean;
  failRemove?: boolean;
} = {}) {
  const values = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      if (failRead) throw new Error("read blocked");
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (failWrite) throw new Error("write blocked");
      values.set(key, value);
    },
    removeItem(key: string) {
      if (failRemove) throw new Error("remove blocked");
      values.delete(key);
    },
  } satisfies MiuraBrowserStorage;

  return { storage, values };
}

function createDraftLocalExport({
  idSeed,
  now,
  projectName = "Portal operativo",
}: {
  idSeed: string;
  now: string;
  projectName?: string;
}) {
  const result = createDraftMiuraEvaluation({
    formInput: {
      ...validFormInput,
      projectName,
    },
    idSeed,
    now,
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  return result.data.localExport;
}

function firstEvaluation(localExport: MiuraLocalExport) {
  const evaluation = localExport.evaluations[0];

  if (evaluation === undefined) {
    throw new Error("Expected fixture evaluation.");
  }

  return evaluation;
}

describe("MIURA local browser store", () => {
  beforeEach(() => {
    const { storage } = createMemoryStorage();

    clearMiuraLocalStore({ storage });
  });

  test("starts empty when no local export is stored", () => {
    const { storage } = createMemoryStorage();
    const state = readMiuraLocalStore({ storage });

    expect(state.mode).toBe("persistent");
    expect(state.localExport).toBeUndefined();
    expect(state.warning).toBeUndefined();
  });

  test("upserts and reads a schema-valid local export", () => {
    const { storage } = createMemoryStorage();
    const localExport = createDraftLocalExport({
      idSeed: "store-seed",
      now: "2026-05-18T08:00:00.000Z",
    });

    const written = upsertMiuraLocalExport(localExport, { storage });
    const read = readMiuraLocalStore({ storage });

    expect(written.mode).toBe("persistent");
    expect(read.localExport?.evaluations[0]?.id).toBe("evaluation-store-seed");
    expect(read.localExport?.projects[0]?.name).toBe("Portal operativo");
  });

  test("updates an existing evaluation without changing the schema", () => {
    const { storage } = createMemoryStorage();
    const localExport = createDraftLocalExport({
      idSeed: "update-seed",
      now: "2026-05-18T08:00:00.000Z",
    });
    const evaluation: Evaluation = {
      ...firstEvaluation(localExport),
      status: "in_progress",
      updatedAt: "2026-05-18T09:00:00.000Z",
    };

    upsertMiuraLocalExport(localExport, { storage });

    const updated = updateMiuraLocalEvaluation(evaluation, { storage });

    expect(updated?.localExport?.exportedAt).toBe("2026-05-18T09:00:00.000Z");
    expect(updated?.localExport?.evaluations[0]?.status).toBe("in_progress");
  });

  test("serializes stored data as importable MIURA JSON", () => {
    const { storage } = createMemoryStorage();
    const localExport = createDraftLocalExport({
      idSeed: "export-seed",
      now: "2026-05-18T08:00:00.000Z",
    });

    upsertMiuraLocalExport(localExport, { storage });
    const serialized = serializeMiuraLocalExport(
      readMiuraLocalStore({ storage }).localExport,
    );

    expect(serialized.success).toBe(true);

    if (!serialized.success) {
      throw new Error(serialized.message);
    }

    const parsed = parseMiuraLocalExportJson(serialized.data);

    expect(parsed.success).toBe(true);
  });

  test("replace import semantics discard previous local evaluations", () => {
    const { storage } = createMemoryStorage();
    const firstExport = createDraftLocalExport({
      idSeed: "first-seed",
      now: "2026-05-18T08:00:00.000Z",
    });
    const importedExport = createDraftLocalExport({
      idSeed: "imported-seed",
      now: "2026-05-18T10:00:00.000Z",
      projectName: "Proyecto importado",
    });

    upsertMiuraLocalExport(firstExport, { storage });
    replaceMiuraLocalExport(importedExport, { storage });

    const read = readMiuraLocalStore({ storage });

    expect(read.localExport?.evaluations).toHaveLength(1);
    expect(read.localExport?.evaluations[0]?.id).toBe(
      "evaluation-imported-seed",
    );
    expect(read.localExport?.projects[0]?.name).toBe("Proyecto importado");
  });

  test("does not accept invalid imported JSON", () => {
    const parsed = parseMiuraLocalExportJson('{"schemaVersion":999}');

    expect(parsed.success).toBe(false);

    if (parsed.success) {
      throw new Error("Expected invalid JSON to fail.");
    }

    expect(parsed.message).toMatch(/no está soportada/i);
  });

  test("reset removes stored and fallback data", () => {
    const { storage } = createMemoryStorage();
    const localExport = createDraftLocalExport({
      idSeed: "reset-seed",
      now: "2026-05-18T08:00:00.000Z",
    });

    upsertMiuraLocalExport(localExport, { storage });
    clearMiuraLocalStore({ storage });

    expect(readMiuraLocalStore({ storage }).localExport).toBeUndefined();
  });

  test("falls back to memory when localStorage write fails", () => {
    const { storage } = createMemoryStorage({ failWrite: true });
    const localExport = createDraftLocalExport({
      idSeed: "fallback-seed",
      now: "2026-05-18T08:00:00.000Z",
    });

    const written = upsertMiuraLocalExport(localExport, { storage });
    const read = readMiuraLocalStore({ storage });

    expect(written.mode).toBe("session_fallback");
    expect(written.warning).toMatch(/sesión actual/i);
    expect(read.localExport?.evaluations[0]?.id).toBe(
      "evaluation-fallback-seed",
    );
  });

  test("falls back to memory when window.localStorage access is blocked", () => {
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window,
      "localStorage",
    );
    const localExport = createDraftLocalExport({
      idSeed: "blocked-storage-seed",
      now: "2026-05-18T08:00:00.000Z",
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Blocked by test policy", "SecurityError");
      },
    });

    try {
      const written = upsertMiuraLocalExport(localExport);
      const read = readMiuraLocalStore();

      expect(written.mode).toBe("session_fallback");
      expect(written.warning).toMatch(/almacenamiento local/i);
      expect(read.localExport?.evaluations[0]?.id).toBe(
        "evaluation-blocked-storage-seed",
      );
    } finally {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(window, "localStorage");
      } else {
        Object.defineProperty(window, "localStorage", originalDescriptor);
      }
    }
  });

  test("derives the latest local evaluation by updatedAt", () => {
    const olderExport = createDraftLocalExport({
      idSeed: "older-seed",
      now: "2026-05-18T08:00:00.000Z",
    });
    const newerExport = createDraftLocalExport({
      idSeed: "newer-seed",
      now: "2026-05-18T10:00:00.000Z",
    });
    const merged = {
      ...olderExport,
      exportedAt: newerExport.exportedAt,
      workspaces: [...olderExport.workspaces, ...newerExport.workspaces],
      projects: [...olderExport.projects, ...newerExport.projects],
      evaluations: [...olderExport.evaluations, ...newerExport.evaluations],
    };

    expect(latestEvaluationFromLocalExport(merged)?.id).toBe(
      "evaluation-newer-seed",
    );
  });
});
