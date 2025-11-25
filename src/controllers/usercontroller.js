//only allowed for the Phc to create new user and assign roles

const { hashPassword } = require("../lib/password");
const pool = require("../lib/db");

exports.createUser = async (req, res) => {
  const admin = req.user;

  if (admin.role !== "phc_admin")
    return res.status(403).json({ error: "Not authorized" });

  const { name, phone, role, password } = req.body;

  const hashed = await hashPassword(password);

  const q = await pool.query(
    `INSERT INTO users (name, phone, role, phc_id, password_hash, created_by, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'active')
     RETURNING id`,
    [name, phone, role, admin.phc_id, hashed, admin.sub]
  );

  const user_id = q.rows[0].id;

  if (role === "asha") {
    await pool.query("INSERT INTO asha_workers (user_id) VALUES ($1)", [user_id]);
  }

  if (role === "anm") {
    await pool.query("INSERT INTO anm_workers (user_id) VALUES ($1)", [user_id]);
  }

  return res.json({ message: "User created", user_id });
};


//JWT Payload
// {
//   "sub": "user_id",
//   "role": "asha | anm | doctor | phc_admin",
//   "phc_id": "phc_uuid",
//   "asha_id": "asha_worker_uuid or null",
//   "anm_id": "anm_worker_uuid or null",
//   "status": "active",
//   "iat": 123,
//   "exp": 123
// }
