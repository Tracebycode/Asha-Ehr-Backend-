const pool = require("../lib/db");

exports.addHealthRecord = async (req, res) => {
  try {
    const user = req.user;

    // 1️⃣ Only ASHA can add health records
    if (user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can add health records" });
    }

    const { member_id, task_id, visit_type, data_json } = req.body;

    // 2️⃣ Required fields
    if (!member_id || !visit_type || !data_json) {
      return res.status(400).json({
        error: "member_id, visit_type and data_json are required"
      });
    }

    // 3️⃣ Check if member belongs to ASHA's family
    const family = await pool.query(
      `SELECT f.area_id, f.anm_worker_id 
       FROM family_members m
       JOIN families f ON m.family_id = f.id
       WHERE m.id = $1 AND f.asha_worker_id = $2`,
      [member_id, user.asha_id]
    );

    if (family.rowCount === 0) {
      return res.status(403).json({
        error: "This member does not belong to this ASHA"
      });
    }

    const area_id = family.rows[0].area_id;
    const anm_id = family.rows[0].anm_worker_id;

    // 4️⃣ Insert health record
    const insert = await pool.query(
      `INSERT INTO health_records 
      (phc_id, member_id, asha_worker_id, anm_worker_id, area_id, task_id, visit_type, data_json)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        user.phc_id,
        member_id,
        user.asha_id,
        anm_id,
        area_id,
        task_id || null,
        visit_type,
        data_json
      ]
    );

    return res.status(201).json({
      message: "Health record added",
      record: insert.rows[0]
    });

  } catch (err) {
    console.error("addHealthRecord ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
