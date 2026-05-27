const express = require("express");

const { createHealthRouter } = require("./routes/healthRoutes");
const { createInvoiceRouter } = require("./routes/invoiceRoutes");
const { createReportRouter } = require("./routes/reportRoutes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

function createApp({ invoiceService, reportService }) {
  const app = express();

  app.use(express.json());

  app.use(createHealthRouter());
  app.use(createInvoiceRouter({ invoiceService }));
  app.use(createReportRouter({ reportService }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
