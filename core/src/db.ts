import { SQL } from "bun";

const connectionString = Bun.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy core/.env.example to core/.env and start the database with `docker compose up -d`.",
  );
}

export const sql = new SQL(connectionString, {
  max: 10,
  idleTimeout: 30,
  connectionTimeout: 10,
});
