const jwt = require("jsonwebtoken");
const { comparePassword } = require("../lib/password");
const pool = require("../lib/db"); // pg pool

exports.login = async (req, res) => {
  const { phone, password } = req.body;

  const q = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
  if (q.rowCount === 0)
    return res.status(404).json({ error: "User not found" });

  const user = q.rows[0];

  if (user.status !== "active")
    return res.status(403).json({ error: "Account disabled" });

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  let asha_id = null;
  let anm_id = null;

  if (user.role === "asha") {
    const r = await pool.query("SELECT id FROM asha_workers WHERE user_id=$1", [user.id]);
    asha_id = r.rows[0]?.id || null;
  }

  if (user.role === "anm") {
    const r = await pool.query("SELECT id FROM anm_workers WHERE user_id=$1", [user.id]);
    anm_id = r.rows[0]?.id || null;
  }

  if (role === "doctor") {
  await pool.query(
    "INSERT INTO doctor_workers (user_id, specialization, license_number) VALUES ($1, $2, $3)",
    [user_id, req.body.specialization || null, req.body.license_number || null]
  );
}

  const token = jwt.sign(
    {
      sub: user.id,
      role: user.role,
      phc_id: user.phc_id,
      asha_id,
      anm_id,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({ token });
};
