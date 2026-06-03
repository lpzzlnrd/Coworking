const express = require("express");

const {
  parseInstant,
  parsePagination,
  validateRevenuePeriod,
  validateUuid
} = require("../utils/validation");
const { BadRequestError } = require("../errors");

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function createReportRouter({ reportService }) {
  const router = express.Router();

  router.get(
    "/reports/revenue",
    asyncRoute(async (req, res) => {
      const period = validateRevenuePeriod(req.query.period);
      const from = parseInstant(req.query.from, "from");
      const to = parseInstant(req.query.to, "to");

      if (from.getTime() > to.getTime()) {
        throw new BadRequestError("'from' must not be after 'to'");
      }

      const summary = await reportService.revenueSummary(period, from, to);
      res.json(summary);
    })
  );

  router.get(
    "/reports/members/:memberId/billing",
    asyncRoute(async (req, res) => {
      const memberId = validateUuid(req.params.memberId, "memberId");
      const { page, size } = parsePagination(req.query.page, req.query.size);
      const history = await reportService.memberHistory(memberId, page, size);
      res.json(history);
    })
  );

  return router;
}

module.exports = { createReportRouter };
