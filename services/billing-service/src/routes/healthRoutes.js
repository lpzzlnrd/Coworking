const express = require("express");

function createHealthRouter() {
  const router = express.Router();

  router.get("/health", (req, res) => {
    res.json({ status: "ok", service: "billing-service" });
  });

  return router;
}

module.exports = { createHealthRouter };
