const path = require("path");

function parsePort(value) {
  const parsed = Number.parseInt(value ?? "8002", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 8002;
}

function normalizeDatabaseUrl(value) {
  if (!value) {
    return "postgresql://localhost:5432/role_manage";
  }

  return value.startsWith("jdbc:") ? value.slice(5) : value;
}

function getDatabaseConfig() {
  const connectionString = normalizeDatabaseUrl(process.env.BILLING_DATABASE_URL);
  const parsedUrl = new URL(connectionString);

  if (process.env.BILLING_DB_USER) {
    parsedUrl.username = process.env.BILLING_DB_USER;
  }

  if (process.env.BILLING_DB_PASSWORD) {
    parsedUrl.password = process.env.BILLING_DB_PASSWORD;
  }

  return {
    connectionString: parsedUrl.toString()
  };
}

const config = {
  port: parsePort(process.env.PORT),
  serviceName: "billing-service",
  database: getDatabaseConfig(),
  migrationsDir: path.join(__dirname, "..", "migrations")
};

module.exports = { config };
