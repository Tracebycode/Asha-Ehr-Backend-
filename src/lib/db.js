const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,  // limit connections (important)
  ssl: {
    require: true,          // force SSL
    rejectUnauthorized: false
  }
});

module.exports = pool;
