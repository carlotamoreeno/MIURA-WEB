"use client";

import {
  CURRENT_LOCAL_SCHEMA_VERSION,
  miuraLocalExportSchema,
  parseMiuraLocalExportJson,
  serializeMiuraLocalExport,
  type Evaluation,
  type MiuraLocalExport,
} from "@/lib/miura/schemas";

type MiuraBrowserStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

type MiuraLocalStoreMode = "persistent" | "session_fallback";

type MiuraLocalStoreState = {
  localExport?: MiuraLocalExport;
  mode: MiuraLocalStoreMode;
  warning?: string;
};

type MiuraLocalStoreOptions = {
  storage?: MiuraBrowserStorage;
};

type MiuraStorageResolution =
  | {
      status: "available";
      storage: MiuraBrowserStorage;
    }
  | {
      status: "unavailable";
      warning: string;
    };

const MIURA_LOCAL_STORAGE_KEY = `miura.local-export.v${CURRENT_LOCAL_SCHEMA_VERSION}`;
const MIURA_LOCAL_STORE_EVENT = "miura:local-store-changed";

let fallbackLocalExport: MiuraLocalExport | undefined;
let fallbackWarning: string | undefined;

function notifyLocalStoreChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent(MIURA_LOCAL_STORE_EVENT));
}

function fallbackState(warning: string): MiuraLocalStoreState {
  fallbackWarning = warning;

  return {
    localExport: fallbackLocalExport,
    mode: "session_fallback",
    warning,
  };
}

function storageUnavailableWarning() {
  return "El almacenamiento local del navegador no está disponible. La evaluación vivirá solo en la sesión actual.";
}

function storageWriteWarning() {
  return "No se ha podido guardar en localStorage. La evaluación vivirá solo en la sesión actual.";
}

function storageReadWarning() {
  return "No se ha podido leer localStorage. La app continúa con los datos disponibles solo en esta sesión.";
}

function resolveStorage(
  options?: MiuraLocalStoreOptions,
): MiuraStorageResolution {
  if (options?.storage !== undefined) {
    return {
      status: "available",
      storage: options.storage,
    };
  }

  if (typeof window === "undefined") {
    return {
      status: "unavailable",
      warning: storageUnavailableWarning(),
    };
  }

  try {
    const storage = window.localStorage;

    if (storage === undefined || storage === null) {
      return {
        status: "unavailable",
        warning: storageUnavailableWarning(),
      };
    }

    return {
      status: "available",
      storage,
    };
  } catch {
    return {
      status: "unavailable",
      warning: storageUnavailableWarning(),
    };
  }
}

function validateAndNormalizeLocalExport(localExport: MiuraLocalExport) {
  return miuraLocalExportSchema.parse(localExport);
}

function readMiuraLocalStore(
  options?: MiuraLocalStoreOptions,
): MiuraLocalStoreState {
  if (fallbackWarning !== undefined) {
    return {
      localExport: fallbackLocalExport,
      mode: "session_fallback",
      warning: fallbackWarning,
    };
  }

  const storage = resolveStorage(options);

  if (storage.status === "unavailable") {
    return fallbackState(storage.warning);
  }

  let storedJson: string | null;

  try {
    storedJson = storage.storage.getItem(MIURA_LOCAL_STORAGE_KEY);
  } catch {
    return fallbackState(storageReadWarning());
  }

  if (storedJson === null) {
    return {
      mode: "persistent",
    };
  }

  const parsed = parseMiuraLocalExportJson(storedJson);

  if (!parsed.success) {
    return {
      mode: "persistent",
      warning: parsed.message,
    };
  }

  return {
    localExport: parsed.data,
    mode: "persistent",
  };
}

function writeMiuraLocalExport(
  localExport: MiuraLocalExport,
  options?: MiuraLocalStoreOptions,
): MiuraLocalStoreState {
  const normalizedLocalExport = validateAndNormalizeLocalExport(localExport);
  const serialized = serializeMiuraLocalExport(normalizedLocalExport);

  if (!serialized.success) {
    return fallbackState(serialized.message);
  }

  const storage = resolveStorage(options);

  if (storage.status === "unavailable") {
    fallbackLocalExport = normalizedLocalExport;
    const state = fallbackState(storage.warning);
    notifyLocalStoreChanged();
    return state;
  }

  try {
    storage.storage.setItem(MIURA_LOCAL_STORAGE_KEY, serialized.data);
    fallbackLocalExport = undefined;
    fallbackWarning = undefined;
    notifyLocalStoreChanged();

    return {
      localExport: normalizedLocalExport,
      mode: "persistent",
    };
  } catch {
    fallbackLocalExport = normalizedLocalExport;
    const state = fallbackState(storageWriteWarning());
    notifyLocalStoreChanged();
    return state;
  }
}

function upsertById<T extends { id: string }>(
  currentItems: readonly T[],
  incomingItems: readonly T[],
) {
  const itemsById = new Map(currentItems.map((item) => [item.id, item]));

  incomingItems.forEach((item) => {
    itemsById.set(item.id, item);
  });

  return Array.from(itemsById.values());
}

function mergeMiuraLocalExports(
  currentLocalExport: MiuraLocalExport | undefined,
  incomingLocalExport: MiuraLocalExport,
) {
  if (currentLocalExport === undefined) {
    return validateAndNormalizeLocalExport(incomingLocalExport);
  }

  return validateAndNormalizeLocalExport({
    schemaVersion: CURRENT_LOCAL_SCHEMA_VERSION,
    exportedAt: incomingLocalExport.exportedAt,
    workspaces: upsertById(
      currentLocalExport.workspaces,
      incomingLocalExport.workspaces,
    ),
    projects: upsertById(
      currentLocalExport.projects,
      incomingLocalExport.projects,
    ),
    evaluations: upsertById(
      currentLocalExport.evaluations,
      incomingLocalExport.evaluations,
    ),
  });
}

function upsertMiuraLocalExport(
  incomingLocalExport: MiuraLocalExport,
  options?: MiuraLocalStoreOptions,
) {
  const currentState = readMiuraLocalStore(options);
  const mergedLocalExport = mergeMiuraLocalExports(
    currentState.localExport,
    incomingLocalExport,
  );

  return writeMiuraLocalExport(mergedLocalExport, options);
}

function replaceMiuraLocalExport(
  incomingLocalExport: MiuraLocalExport,
  options?: MiuraLocalStoreOptions,
) {
  return writeMiuraLocalExport(incomingLocalExport, options);
}

function updateMiuraLocalEvaluation(
  evaluation: Evaluation,
  options?: MiuraLocalStoreOptions,
) {
  const currentState = readMiuraLocalStore(options);
  const currentLocalExport = currentState.localExport;

  if (currentLocalExport === undefined) {
    return undefined;
  }

  const hasEvaluation = currentLocalExport.evaluations.some(
    (storedEvaluation) => storedEvaluation.id === evaluation.id,
  );

  if (!hasEvaluation) {
    return undefined;
  }

  return writeMiuraLocalExport(
    {
      ...currentLocalExport,
      exportedAt: evaluation.updatedAt,
      evaluations: currentLocalExport.evaluations.map((storedEvaluation) =>
        storedEvaluation.id === evaluation.id ? evaluation : storedEvaluation,
      ),
    },
    options,
  );
}

function clearMiuraLocalStore(options?: MiuraLocalStoreOptions) {
  fallbackLocalExport = undefined;
  fallbackWarning = undefined;

  const storage = resolveStorage(options);

  if (storage.status === "available") {
    try {
      storage.storage.removeItem(MIURA_LOCAL_STORAGE_KEY);
    } catch {
      fallbackWarning =
        "No se ha podido borrar localStorage, pero se ha limpiado la sesión actual.";
    }
  } else {
    fallbackWarning = storage.warning;
  }

  notifyLocalStoreChanged();

  return readMiuraLocalStore(options);
}

function latestEvaluationFromLocalExport(localExport: MiuraLocalExport) {
  return [...localExport.evaluations]
    .filter((evaluation) => evaluation.status !== "deleted")
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )[0];
}

export {
  MIURA_LOCAL_STORAGE_KEY,
  MIURA_LOCAL_STORE_EVENT,
  clearMiuraLocalStore,
  latestEvaluationFromLocalExport,
  readMiuraLocalStore,
  replaceMiuraLocalExport,
  updateMiuraLocalEvaluation,
  upsertMiuraLocalExport,
  type MiuraBrowserStorage,
  type MiuraLocalStoreMode,
  type MiuraLocalStoreState,
};
