const jwt = require("jsonwebtoken");
const { comparePassword } = require("../lib/password");
const pool = require("../lib/db");

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Check user exists
    const q = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const user = q.rows[0];

    // Password check
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Prepare profile enrichment
    let worker_id = null;
    let supervisor_name = null;
    let assigned_areas = [];

    // ---- 1. GET ASSIGNED AREAS ----
    const areaQ = await pool.query(`
      SELECT a.area_name 
      FROM user_area_map m 
      JOIN phc_areas a ON m.area_id = a.id
      WHERE m.user_id = $1
    `, [user.id]);

    assigned_areas = areaQ.rows.map(r => r.area_name);

    // ---- 2. IF ASHA → find ANM supervisor ----
    if (user.role === "asha") {
      const supQ = await pool.query(`
        SELECT u.name 
        FROM user_supervision_map m
        JOIN users u ON u.id = m.anm_id
        WHERE m.asha_id = $1
      `, [user.id]);

      supervisor_name = supQ.rows[0]?.name || null;
    }

    // ---- 3. IF ANM → find list of ASHA workers ----
    let supervised_ashas = [];
    if (user.role === "anm") {
      const anmQ = await pool.query(`
        SELECT u.name 
        FROM user_supervision_map m
        JOIN users u ON u.id = m.asha_id
        WHERE m.anm_id = $1
      `, [user.id]);

      supervised_ashas = anmQ.rows.map(r => r.name);
    }

    // ---- 4. Create JWT ----
    const token = jwt.sign(
      {
        sub: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        phc_id: user.phc_id,

        areas: assigned_areas,           // AREA NAMES ARRAY
        supervisor_name,                 // ONLY FOR ASHA
        supervised_ashas,                // ONLY FOR ANM

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
