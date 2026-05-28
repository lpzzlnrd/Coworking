const fs = require("fs/promises");
const path = require("path");

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_js_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getPendingMigrations(pool, migrationsDir) {
  const files = await fs.readdir(migrationsDir);
  const migrationFiles = files
    .filter((file) => /^V\d+__.+\.sql$/.test(file))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const result = await pool.query("SELECT version FROM billing_js_migrations");
  const appliedVersions = new Set(result.rows.map((row) => row.version));

  return migrationFiles
    .map((fileName) => ({
      fileName,
      version: fileName.split("__", 1)[0]
    }))
    .filter((migration) => !appliedVersions.has(migration.version));
}

async function runMigrations(pool, migrationsDir) {
  await ensureMigrationsTable(pool);

  const pendingMigrations = await getPendingMigrations(pool, migrationsDir);
  for (const migration of pendingMigrations) {
    const sql = await fs.readFile(path.join(migrationsDir, migration.fileName), "utf8");
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `
          INSERT INTO billing_js_migrations (version, name)
          VALUES ($1, $2)
        `,
        [migration.version, migration.fileName]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = { runMigrations };
