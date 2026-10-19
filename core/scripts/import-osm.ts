#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import { SQL } from "bun";

const CORE_DIR = join(import.meta.dir, "..");
const DATA_DIR = join(CORE_DIR, "data");
const PBF_PATH = join(DATA_DIR, "maharashtra-latest.osm.pbf");
const STYLE_PATH = join(import.meta.dir, "pois.lua");
const PBF_URL =
  "https://download.geofabrik.de/asia/india/maharashtra-latest.osm.pbf";

const force = process.argv.includes("--force");

async function loadCoreEnv() {
  const envPath = join(CORE_DIR, ".env");
  if (!existsSync(envPath)) return;

  const text = await Bun.file(envPath).text();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^(["'])(.*)\1$/, "$2");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function downloadExtract() {
  await mkdir(DATA_DIR, { recursive: true });

  if (!force && existsSync(PBF_PATH)) {
    console.log(`Using existing extract: ${PBF_PATH}`);
    return;
  }

  console.log(`Downloading ${PBF_URL}`);
  const response = await fetch(PBF_URL);

  if (!response.ok || !response.body) {
    throw new Error(
      `Download failed: ${response.status} ${response.statusText}`,
    );
  }

  const temporaryPath = `${PBF_PATH}.part`;
  const writer = Bun.file(temporaryPath).writer();

  for await (const chunk of response.body) {
    writer.write(chunk);
  }

  await writer.end();
  await rm(PBF_PATH, { force: true });
  await rename(temporaryPath, PBF_PATH);
  console.log(`Saved extract to ${PBF_PATH}`);
}

function findOsm2pgsql() {
  return process.env.OSM2PGSQL_BIN ?? Bun.which("osm2pgsql");
}

async function createIndexes(databaseUrl: string) {
  const sql = new SQL(databaseUrl);
  try {
    await sql`CREATE INDEX IF NOT EXISTS pois_geom_utm_idx ON pois USING GIST (ST_Transform(geom, 32643))`;
    await sql`CREATE INDEX IF NOT EXISTS pois_category_idx ON pois (category)`;
    await sql`ANALYZE pois`;

    const [row] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM pois
    `;
    console.log(`Imported ${row?.count ?? 0} POIs.`);
  } finally {
    await sql.close();
  }
}

async function main() {
  await loadCoreEnv();

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Copy core/.env.example to core/.env first.",
    );
  }

  const osm2pgsql = findOsm2pgsql();
  if (!osm2pgsql) {
    throw new Error(
      "osm2pgsql was not found. Install osm2pgsql 2.x and put it on PATH, or set OSM2PGSQL_BIN.",
    );
  }

  await downloadExtract();

  console.log("Importing POIs with osm2pgsql...");
  const child = Bun.spawn({
    cmd: [
      osm2pgsql,
      "--database",
      databaseUrl,
      "--output",
      "flex",
      "--style",
      STYLE_PATH,
      "--create",
      "--slim",
      "--drop",
      PBF_PATH,
    ],
    cwd: CORE_DIR,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`osm2pgsql exited with code ${exitCode}`);
  }

  console.log("Creating spatial indexes...");
  await createIndexes(databaseUrl);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
