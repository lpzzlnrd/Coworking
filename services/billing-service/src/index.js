const { createApp } = require("./app");
const { config } = require("./config");
const { runMigrations } = require("./db/migrate");
const { createPool } = require("./db/pool");
const { createInvoiceRepository } = require("./repositories/invoiceRepository");
const { createInvoiceService } = require("./services/invoiceService");
const { createReportService } = require("./services/reportService");

async function start() {
  const pool = createPool(config.database);
  await runMigrations(pool, config.migrationsDir);

  const invoiceRepository = createInvoiceRepository(pool);
  const invoiceService = createInvoiceService({ invoiceRepository });
  const reportService = createReportService({ invoiceRepository, invoiceService });
  const app = createApp({ invoiceService, reportService });

  const server = app.listen(config.port, () => {
    console.log(`${config.serviceName} listening on port ${config.port}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Failed to start billing-service", error);
  process.exit(1);
});
