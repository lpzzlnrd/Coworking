const assert = require("node:assert/strict");
const test = require("node:test");

const { buildPageResponse } = require("../src/utils/pagination");
const {
  parseInstant,
  parsePagination,
  validateCreateInvoiceRequest,
  validateRevenuePeriod,
  validateUuid
} = require("../src/utils/validation");
const { BadRequestError, ValidationError } = require("../src/errors");

test("validateUuid accepts valid UUIDs and rejects invalid ones", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  assert.equal(validateUuid(uuid, "memberId"), uuid);
  assert.throws(() => validateUuid("not-a-uuid", "memberId"), BadRequestError);
});

test("parseInstant validates ISO-8601 strings", () => {
  const instant = parseInstant("2026-05-30T12:00:00.000Z", "from");

  assert.equal(instant.toISOString(), "2026-05-30T12:00:00.000Z");
  assert.throws(() => parseInstant("", "from"), BadRequestError);
  assert.throws(() => parseInstant("invalid", "from"), BadRequestError);
});

test("parsePagination applies defaults and rejects invalid values", () => {
  assert.deepEqual(parsePagination(undefined, undefined), { page: 0, size: 20 });
  assert.deepEqual(parsePagination("2", "15"), { page: 2, size: 15 });

  assert.throws(() => parsePagination("-1", "10"), BadRequestError);
  assert.throws(() => parsePagination("1", "0"), BadRequestError);
  assert.throws(() => parsePagination("abc", "10"), BadRequestError);
});

test("validateRevenuePeriod normalizes valid values", () => {
  assert.equal(validateRevenuePeriod("DAILY"), "daily");
  assert.equal(validateRevenuePeriod("monthly"), "monthly");
  assert.throws(() => validateRevenuePeriod("quarterly"), BadRequestError);
});

test("validateCreateInvoiceRequest returns a normalized payload", () => {
  const payload = validateCreateInvoiceRequest({
    memberId: "550e8400-e29b-41d4-a716-446655440000",
    amount: "125.50",
    description: "Monthly desk rental",
    dueDate: "2100-01-01T00:00:00.000Z"
  });

  assert.equal(payload.memberId, "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(payload.amount, 125.5);
  assert.equal(payload.description, "Monthly desk rental");
  assert.equal(payload.dueDate.toISOString(), "2100-01-01T00:00:00.000Z");
});

test("validateCreateInvoiceRequest collects field errors", () => {
  assert.throws(
    () =>
      validateCreateInvoiceRequest({
        memberId: "invalid",
        amount: "0",
        description: "",
        dueDate: "2020-01-01T00:00:00.000Z"
      }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.deepEqual(error.details, [
        "memberId: memberId must be a valid UUID",
        "amount: amount must be greater than zero",
        "description: description is required",
        "dueDate: dueDate must be in the future"
      ]);
      return true;
    }
  );
});

test("buildPageResponse builds standard pagination metadata", () => {
  const response = buildPageResponse([{ id: 1 }], 1, 10, 25);

  assert.deepEqual(response.content, [{ id: 1 }]);
  assert.equal(response.totalPages, 3);
  assert.equal(response.totalElements, 25);
  assert.equal(response.pageable.pageNumber, 1);
  assert.equal(response.pageable.offset, 10);
  assert.equal(response.first, false);
  assert.equal(response.last, false);
  assert.equal(response.empty, false);
});
