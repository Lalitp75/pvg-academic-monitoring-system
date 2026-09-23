import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

export async function ensureAttendanceBatchColumn() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  const result = await env.DB.prepare("PRAGMA table_info(attendance_entries)").all<{ name: string }>();
  if (result.results.some((column) => column.name === "batch")) return;
  try {
    await env.DB.prepare("ALTER TABLE attendance_entries ADD COLUMN batch TEXT NOT NULL DEFAULT ''").run();
  } catch (error) {
    const retry = await env.DB.prepare("PRAGMA table_info(attendance_entries)").all<{ name: string }>();
    if (!retry.results.some((column) => column.name === "batch")) throw error;
  }
}
