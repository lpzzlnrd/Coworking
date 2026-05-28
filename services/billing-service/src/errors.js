class AppError extends Error {
  constructor(status, error, message, details = null) {
    super(message);
    this.status = status;
    this.error = error;
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(404, "Not Found", message);
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, "Conflict", message);
  }
}

class BadRequestError extends AppError {
  constructor(message) {
    super(400, "Bad Request", message);
  }
}

class ValidationError extends AppError {
  constructor(details) {
    super(400, "Validation Failed", "One or more fields are invalid", details);
  }
}

function toErrorResponse(error) {
  return {
    status: error.status ?? 500,
    error: error.error ?? "Internal Server Error",
    message: error.status ? error.message : "An unexpected error occurred",
    details: error.details ?? null,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  ValidationError,
  toErrorResponse
};
