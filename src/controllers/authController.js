const jwt = require("jsonwebtoken");
const { comparePassword } = require("../lib/password");
const pool = require("../lib/db");

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Find user
    const q = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const user = q.rows[0];

    // Check status
    if (user.status !== "active")
      return res.status(403).json({ error: "Account disabled" });

    // Check password
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Worker IDs for JWT
    let asha_id = null;
    let anm_id = null;
    let doctor_id = null;

    if (user.role === "asha") {
      const r = await pool.query("SELECT id FROM asha_workers WHERE user_id=$1", [user.id]);
      asha_id = r.rows[0]?.id || null;
    }

    if (user.role === "anm") {
      const r = await pool.query("SELECT id FROM anm_workers WHERE user_id=$1", [user.id]);
      anm_id = r.rows[0]?.id || null;
    }

    if (user.role === "doctor") {
      const r = await pool.query("SELECT id FROM doctor_workers WHERE user_id=$1", [user.id]);
      doctor_id = r.rows[0]?.id || null;
    }

    // Create token
    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        phc_id: user.phc_id,
        asha_id,
        anm_id,
        doctor_id,
        status: user.status
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({ token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
