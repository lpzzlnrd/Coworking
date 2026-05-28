const { AppError, NotFoundError, toErrorResponse } = require("../errors");

function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  if (!(error instanceof AppError)) {
    console.error(error);
  }

  const response = toErrorResponse(error);
  res.status(response.status).json(response);
}

module.exports = { errorHandler, notFoundHandler };
