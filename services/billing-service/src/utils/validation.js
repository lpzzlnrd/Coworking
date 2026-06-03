const { BadRequestError, ValidationError } = require("../errors");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_REVENUE_PERIODS = new Set(["daily", "monthly", "yearly"]);

function validateUuid(value, fieldName) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new BadRequestError(`${fieldName} must be a valid UUID`);
  }

  return value;
}

function parseNonNegativeInteger(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new BadRequestError(`${fieldName} must be an integer`);
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed < 0) {
    throw new BadRequestError(`${fieldName} must not be negative`);
  }

  return parsed;
}

function parsePositiveInteger(value, fieldName, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== "string" || !/^-?\d+$/.test(value)) {
    throw new BadRequestError(`${fieldName} must be an integer`);
  }

  const parsed = Number.parseInt(value, 10);
  if (parsed <= 0) {
    throw new BadRequestError(`${fieldName} must be greater than zero`);
  }

  return parsed;
}

function parsePagination(pageValue, sizeValue) {
  return {
    page: parseNonNegativeInteger(pageValue, "page", 0),
    size: parsePositiveInteger(sizeValue, "size", 20)
  };
}

function parseInstant(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new BadRequestError(`${fieldName} is required`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${fieldName} must be a valid ISO-8601 instant`);
  }

  return date;
}

function validateAmount(value, details) {
  if (value === undefined || value === null || value === "") {
    details.push("amount: amount is required");
    return null;
  }

  const normalizedValue = typeof value === "number" ? value.toString() : String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    details.push("amount: amount must have at most 10 integer digits and 2 decimal places");
    return null;
  }

  const [integerPart] = normalizedValue.split(".");
  if (integerPart.length > 10) {
    details.push("amount: amount must have at most 10 integer digits and 2 decimal places");
    return null;
  }

  const amount = Number.parseFloat(normalizedValue);
  if (!Number.isFinite(amount) || amount <= 0) {
    details.push("amount: amount must be greater than zero");
    return null;
  }

  return amount;
}

function validateCreateInvoiceRequest(body) {
  const details = [];
  const payload = body && typeof body === "object" ? body : {};

  let memberId = null;
  if (payload.memberId === undefined || payload.memberId === null) {
    details.push("memberId: memberId is required");
  } else if (typeof payload.memberId !== "string" || !UUID_PATTERN.test(payload.memberId)) {
    details.push("memberId: memberId must be a valid UUID");
  } else {
    memberId = payload.memberId;
  }

  const amount = validateAmount(payload.amount, details);

  let description = null;
  if (typeof payload.description !== "string" || payload.description.trim() === "") {
    details.push("description: description is required");
  } else if (payload.description.length > 500) {
    details.push("description: description must not exceed 500 characters");
  } else {
    description = payload.description;
  }

  let dueDate = null;
  if (payload.dueDate === undefined || payload.dueDate === null || payload.dueDate === "") {
    details.push("dueDate: dueDate is required");
  } else {
    const parsedDueDate = new Date(payload.dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      details.push("dueDate: dueDate must be a valid ISO-8601 instant");
    } else if (parsedDueDate.getTime() <= Date.now()) {
      details.push("dueDate: dueDate must be in the future");
    } else {
      dueDate = parsedDueDate;
    }
  }

  if (details.length > 0) {
    throw new ValidationError(details);
  }

  return { memberId, amount, description, dueDate };
}

function validateRevenuePeriod(period) {
  if (typeof period !== "string" || !ALLOWED_REVENUE_PERIODS.has(period.toLowerCase())) {
    throw new BadRequestError(
      `Invalid period '${period}'. Valid values: daily, monthly, yearly`
    );
  }

  return period.toLowerCase();
}

module.exports = {
  parseInstant,
  parsePagination,
  validateCreateInvoiceRequest,
  validateRevenuePeriod,
  validateUuid
};
