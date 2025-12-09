const pool = require("../lib/db");

// =======================
// 1. GET ALL ASHA WORKERS
// =======================
exports.getAllAshaWorkers = async (req, res) => {
  try {
    const phcId = req.user.phc_id;

    const query = `
      SELECT 
        aw.id AS asha_id,
        u.name,
        u.phone,
        u.status,
        usm.anm_worker_id,
        (
          SELECT json_agg(pa.area_name)
          FROM user_area_map uam 
          JOIN phc_areas pa ON pa.id = uam.area_id
          WHERE uam.user_id = u.id
        ) AS areas,
        (SELECT COUNT(*) FROM families f WHERE f.asha_worker_id = aw.id) AS total_families,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to_asha_id = aw.id) AS total_tasks
      FROM asha_workers aw
      JOIN users u ON u.id = aw.user_id
      LEFT JOIN user_supervision_map usm ON usm.asha_worker_id = aw.id
      WHERE u.phc_id = $1
      ORDER BY u.name ASC;
    `;

    const { rows } = await pool.query(query, [phcId]);

    res.json(rows);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// =======================
// 2. GET ASHA FULL DETAILS
// =======================
exports.getAshaDetails = async (req, res) => {
  try {
    const { ashaId } = req.params;
    const phcId = req.user.phc_id;

    // BASIC PROFILE
    const ashaQuery = `
      SELECT 
        aw.id AS asha_id,
        u.name,
        u.phone,
        u.status,
        usm.anm_worker_id,
        u.created_at
      FROM asha_workers aw
      JOIN users u ON u.id = aw.user_id
      LEFT JOIN user_supervision_map usm ON usm.asha_worker_id = aw.id
      WHERE aw.id = $1 AND u.phc_id = $2;
    `;

    const asha = await pool.query(ashaQuery, [ashaId, phcId]);

    if (asha.rows.length === 0)
      return res.status(404).json({ error: "ASHA not found under your PHC" });

    // AREAS
    const areasQuery = `
      SELECT pa.id, pa.area_name 
      FROM user_area_map uam 
      JOIN phc_areas pa ON pa.id = uam.area_id
      WHERE uam.user_id = (SELECT user_id FROM asha_workers WHERE id = $1);
    `;
    const areas = await pool.query(areasQuery, [ashaId]);

    // FAMILIES + MEMBERS
    const familiesQuery = `
      SELECT 
        f.id AS family_id,
        f.address_line,
        f.landmark,
        (
          SELECT json_agg(fm.*)
          FROM family_members fm 
          WHERE fm.family_id = f.id
        ) AS members
      FROM families f
      WHERE f.asha_worker_id = $1;
    `;
    const families = await pool.query(familiesQuery, [ashaId]);

    // TASKS
    const tasksQuery = `
      SELECT * FROM tasks WHERE assigned_to_asha_id = $1;
    `;
    const tasks = await pool.query(tasksQuery, [ashaId]);

    res.json({
      profile: asha.rows[0],
      areas: areas.rows,
      families: families.rows,
      tasks: tasks.rows
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// =======================
// 3. UPDATE ASHA STATUS
// =======================
exports.updateAshaStatus = async (req, res) => {
  try {
    const { ashaId } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const updateQuery = `
      UPDATE users 
      SET status = $1 
      WHERE id = (SELECT user_id FROM asha_workers WHERE id = $2)
      RETURNING *;
    `;

    const { rows } = await pool.query(updateQuery, [status, ashaId]);

    res.json({ message: "Status updated", user: rows[0] });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// =======================
// 4. GET ALL ANM WORKERS
// =======================
exports.getAllAnmWorkers = async (req, res) => {
  try {
    const phcId = req.user.phc_id;

    const query = `
      SELECT 
        anm.id AS anm_id,
        u.name,
        u.phone,
        u.status,
        (
          SELECT COUNT(*) 
          FROM user_supervision_map 
          WHERE anm_worker_id = anm.id
        ) AS total_ashas
      FROM anm_workers anm
      JOIN users u ON u.id = anm.user_id
      WHERE u.phc_id = $1
      ORDER BY u.name ASC;
    `;

    const { rows } = await pool.query(query, [phcId]);
    res.json(rows);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// =======================
// 5. GET ANM FULL DETAILS
// =======================
exports.getAnmDetails = async (req, res) => {
  try {
    const { anmId } = req.params;
    const phcId = req.user.phc_id;

    const profileQuery = `
      SELECT 
        anm.id AS anm_id,
        u.name,
        u.phone,
        u.status,
        u.created_at
      FROM anm_workers anm
      JOIN users u ON u.id = anm.user_id
      WHERE anm.id = $1 AND u.phc_id = $2;
    `;

    const profile = await pool.query(profileQuery, [anmId, phcId]);
    if (profile.rows.length === 0)
      return res.status(404).json({ error: "ANM not under your PHC" });

    const ashaQuery = `
      SELECT 
        aw.id AS asha_id,
        u.name,
        u.phone
      FROM user_supervision_map usm
      JOIN asha_workers aw ON aw.id = usm.asha_worker_id
      JOIN users u ON u.id = aw.user_id
      WHERE usm.anm_worker_id = $1;
    `;

    const ashas = await pool.query(ashaQuery, [anmId]);

    res.json({
      profile: profile.rows[0],
      supervised_ashas: ashas.rows
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }

};
// =======================
// 6. ASHA SUMMARY (counts)
// =======================
exports.getAshaSummary = async (req, res) => {
  try {
    // PHC admin only
    if (!req.user || req.user.role !== "phc_admin") {
      return res
        .status(403)
        .json({ error: "Access denied: PHC admin only" });
    }

    const phcId = req.user.phc_id;

    // 1) total
    const totalResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total_ashas
      FROM asha_workers aw
      JOIN users u ON u.id = aw.user_id
      WHERE u.phc_id = $1
      `,
      [phcId]
    );
    const total_ashas = totalResult.rows[0]?.total_ashas || 0;

    // 2) active
    const activeResult = await pool.query(
      `
      SELECT COUNT(*)::int AS active_ashas
      FROM asha_workers aw
      JOIN users u ON u.id = aw.user_id
      WHERE u.phc_id = $1
        AND u.status = 'active'
      `,
      [phcId]
    );
    const active_ashas = activeResult.rows[0]?.active_ashas || 0;

    // 3) disabled = total - active (or you can run another query)
    const disabled_ashas = total_ashas - active_ashas;

    return res.json({ total_ashas, active_ashas, disabled_ashas });
  } catch (error) {
    console.error("getAshaSummary ERROR:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
