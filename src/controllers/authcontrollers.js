const jwt = require("jsonwebtoken");
const { comparePassword } = require("../lib/password");
const pool = require("../lib/db");

exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // 1. Get user
    const q = await pool.query("SELECT * FROM users WHERE phone=$1", [phone]);
    if (q.rowCount === 0)
      return res.status(404).json({ error: "User not found" });

    const user = q.rows[0];

    // 2. Password check
    const ok = await comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // ---------------------------------------------
    // WORKER IDs
    // ---------------------------------------------
    let asha_worker_id = null;
    let anm_worker_id = null;

    // ASHA worker ID
    if (user.role === "asha") {
      const r = await pool.query(
        "SELECT id FROM asha_workers WHERE user_id=$1",
        [user.id]
      );
      asha_worker_id = r.rows[0]?.id || null;
    }

    // ANM worker ID
    if (user.role === "anm") {
      const r = await pool.query(
        "SELECT id FROM anm_workers WHERE user_id=$1",
        [user.id]
      );
      anm_worker_id = r.rows[0]?.id || null;
    }

    // ---------------------------------------------
    // GET SINGLE AREA
    // ---------------------------------------------
    const areaQ = await pool.query(
      `
      SELECT a.id AS area_id, a.area_name 
      FROM user_area_map m
      JOIN phc_areas a ON a.id = m.area_id
      WHERE m.user_id = $1
      LIMIT 1        -- only one area needed
      `,
      [user.id]
    );

    let area = null;

    if (areaQ.rowCount > 0) {
      area = {
        id: areaQ.rows[0].area_id,
        name: areaQ.rows[0].area_name
      };
    }

    // ---------------------------------------------
    // GET SUPERVISING ANM (for ASHA only)
    // ---------------------------------------------
    if (user.role === "asha") {
      const supQ = await pool.query(`
        SELECT 
          anm.id AS anm_worker_id
        FROM user_supervision_map m
        JOIN asha_workers aw ON aw.id = m.asha_worker_id
        JOIN anm_workers anm ON anm.id = m.anm_worker_id
        WHERE aw.user_id = $1
      `, [user.id]);

      anm_worker_id = supQ.rows[0]?.anm_worker_id || null;
    }

    // ---------------------------------------------
    // BUILD PAYLOAD (YOUR FORMAT)
    // ---------------------------------------------
    const payload = {
      sub: user.id,

      name: user.name,
      phone: user.phone,
      role: user.role,

      phc_id: user.phc_id,
      area,     // 👈 single object

      asha_worker_id,
      anm_worker_id,

      status: user.status
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d"
    });

    return res.json({ token });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
