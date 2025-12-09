const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    require: true,          // force SSL
    rejectUnauthorized: false
  }
});

module.exports = pool;
