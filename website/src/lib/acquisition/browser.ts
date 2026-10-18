import { query } from "../db";
import type { AcquisitionQuery } from "./types";

export const browserAcquisitionQuery: AcquisitionQuery = (sql, params) =>
  query<Record<string, unknown>>(sql, [...params]);
