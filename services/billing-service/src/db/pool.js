const { Pool, types } = require("pg");

types.setTypeParser(1700, (value) => (value === null ? null : Number.parseFloat(value)));

function createPool(databaseConfig) {
  return new Pool(databaseConfig);
}

module.exports = { createPool };
