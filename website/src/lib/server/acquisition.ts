import type Database from "better-sqlite3";
import type {
  AcquisitionQuery,
  AcquisitionRequest,
  AcquisitionModel,
} from "../acquisition/types";
import { queryAcquisitionRows } from "../acquisition/queries";
import { assembleAcquisitionModel } from "../acquisition/assemble";

/** Runs the acquisition queries on a server connection. */
export function acquisitionQuery(db: Database.Database): AcquisitionQuery {
  return async (sql, params) =>
    db.prepare(sql).all(...params) as Record<string, unknown>[];
}

// A page's acquisition trees ask for the same ingredients again and again, and
// pages next to each other ask for many of the same items. A model is frozen
// and depends only on its request and the database, so the most recent models
// of each connection are shared. A connection's data must therefore not change
// while it loads models: change data on a new connection.
const MODELS_PER_CONNECTION = 64;
const models = new WeakMap<
  Database.Database,
  Map<string, Promise<AcquisitionModel>>
>();

export function loadAcquisition(
  db: Database.Database,
  request: AcquisitionRequest,
): Promise<AcquisitionModel> {
  let recent = models.get(db);
  if (!recent) {
    recent = new Map();
    models.set(db, recent);
  }
  const key = JSON.stringify(request);
  const cached = recent.get(key);
  if (cached) {
    recent.delete(key);
    recent.set(key, cached);
    return cached;
  }
  const model = queryAcquisitionRows(acquisitionQuery(db), request).then(
    assembleAcquisitionModel,
  );
  recent.set(key, model);
  model.catch(() => {
    if (recent.get(key) === model) recent.delete(key);
  });
  if (recent.size > MODELS_PER_CONNECTION)
    recent.delete(recent.keys().next().value!);
  return model;
}
