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
    let supervisor_name = null;
    let supervisor_id = null;
    let assigned_areas = [];
    let supervised_ashas = [];

    // ---- 1. GET ASSIGNED AREAS WITH ID + NAME ----
    const areaQ = await pool.query(`
      SELECT 
        a.id AS area_id,
        a.area_name AS area_name
      FROM user_area_map m 
      JOIN phc_areas a ON m.area_id = a.id
      WHERE m.user_id = $1
    `, [user.id]);

    assigned_areas = areaQ.rows.map(r => ({
      id: r.area_id,
      name: r.area_name
    }));

    // ---- 2. IF ASHA → find ANM supervisor ----
    if (user.role === "asha") {
      const supQ = await pool.query(`
        SELECT 
          u.id AS anm_id,
          u.name AS anm_name
        FROM user_supervision_map m
        JOIN users u ON u.id = m.anm_worker_id
        WHERE m.asha_worker_id = $1
      `, [user.id]);

      supervisor_id = supQ.rows[0]?.anm_id || null;
      supervisor_name = supQ.rows[0]?.anm_name || null;
    }

    // ---- 3. IF ANM → find list of ASHA workers ----
    if (user.role === "anm") {
      const anmQ = await pool.query(`
        SELECT u.name 
        FROM user_supervision_map m
        JOIN users u ON u.id = m.asha_worker_id
        WHERE m.anm_worker_id = $1
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

        areas: assigned_areas,
        supervisor_id,
        supervisor_name,
        supervised_ashas,

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
