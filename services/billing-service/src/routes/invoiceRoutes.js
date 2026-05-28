const express = require("express");

const { parsePagination, validateCreateInvoiceRequest, validateUuid } = require("../utils/validation");

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createInvoiceRouter({ invoiceService }) {
  const router = express.Router();

  router.post(
    "/invoices",
    asyncRoute(async (req, res) => {
      const payload = validateCreateInvoiceRequest(req.body);
      const invoice = await invoiceService.create(payload);
      res.status(201).json(invoice);
    })
  );

  router.get(
    "/invoices",
    asyncRoute(async (req, res) => {
      const { page, size } = parsePagination(req.query.page, req.query.size);
      const result = await invoiceService.findAll(page, size);
      res.json(result);
    })
  );

  router.get(
    "/invoices/:id",
    asyncRoute(async (req, res) => {
      const invoiceId = validateUuid(req.params.id, "id");
      const invoice = await invoiceService.findById(invoiceId);
      res.json(invoice);
    })
  );

  router.patch(
    "/invoices/:id/pay",
    asyncRoute(async (req, res) => {
      const invoiceId = validateUuid(req.params.id, "id");
      const invoice = await invoiceService.markPaid(invoiceId);
      res.json(invoice);
    })
  );

  router.patch(
    "/invoices/:id/overdue",
    asyncRoute(async (req, res) => {
      const invoiceId = validateUuid(req.params.id, "id");
      const invoice = await invoiceService.markOverdue(invoiceId);
      res.json(invoice);
    })
  );

  router.post(
    "/invoices/overdue-sweep",
    asyncRoute(async (req, res) => {
      const updatedCount = await invoiceService.bulkMarkOverdue();
      res.json({ updatedCount });
    })
  );

  return router;
}

module.exports = { createInvoiceRouter };
