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
      [member_id, user.asha_worker_id]
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


exports.getByMember = async (req, res) => {
  try {
    const user = req.user;
    const { member_id } = req.params;

    if (!member_id) return res.status(400).json({ error: "member_id is required" });

    let query = "";
    let params = [];

    // ASHA → only members under her families
    if (user.role === "asha") {
      query = `
        SELECT hr.*
        FROM health_records hr
        JOIN family_members fm ON hr.member_id = fm.id
        JOIN families f ON fm.family_id = f.id
        WHERE hr.member_id = $1 AND f.asha_worker_id = $2
        ORDER BY hr.created_at DESC
      `;
      params = [member_id, user.asha_id];
    }
    // ANM → members under supervised ASHAs
    else if (user.role === "anm") {
      query = `
        SELECT hr.*
        FROM health_records hr
        JOIN families f ON hr.area_id = f.area_id
        JOIN user_supervision_map m ON f.asha_worker_id = m.asha_worker_id
        WHERE hr.member_id = $1 AND m.anm_worker_id = $2
        ORDER BY hr.created_at DESC
      `;
      params = [member_id, user.anm_id];
    }
    // PHC ADMIN / DOCTOR → Whole PHC
    else if (user.role === "phc_admin" || user.role === "doctor") {
      query = `
        SELECT *
        FROM health_records
        WHERE member_id = $1 AND phc_id = $2
        ORDER BY created_at DESC
      `;
      params = [member_id, user.phc_id];
    } else {
      return res.status(403).json({ error: "Invalid role" });
    }

    const result = await pool.query(query, params);
    return res.json({ member_id, records: result.rows });

  } catch (err) {
    console.error("getByMember ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


//by family get 
/**
 * 2️⃣ Get Health Records For a Family
 */
exports.getByFamily = async (req, res) => {
  try {
    const user = req.user;
    const { family_id } = req.params;

    if (!family_id) return res.status(400).json({ error: "family_id is required" });

    let famCheckQuery = "";
    let params = [];

    // ASHA → only own family
    if (user.role === "asha") {
      famCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND asha_worker_id = $2
      `;
      params = [family_id, user.asha_id];
    }
    // ANM → supervised families
    else if (user.role === "anm") {
      famCheckQuery = `
        SELECT f.id
        FROM families f
        JOIN user_supervision_map m ON f.asha_worker_id = m.asha_worker_id
        WHERE f.id = $1 AND m.anm_worker_id = $2
      `;
      params = [family_id, user.anm_id];
    }
    // Doctor / PHC admin → full PHC
    else if (user.role === "phc_admin" || user.role === "doctor") {
      famCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND phc_id = $2
      `;
      params = [family_id, user.phc_id];
    }
    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    const famCheck = await pool.query(famCheckQuery, params);
    if (famCheck.rowCount === 0)
      return res.status(403).json({ error: "Unauthorized family access" });

    const members = await pool.query(
      `SELECT id FROM family_members WHERE family_id = $1`,
      [family_id]
    );

    const memberIds = members.rows.map(m => m.id);
    if (memberIds.length === 0)
      return res.json({ family_id, records: [] });

    const records = await pool.query(
      `SELECT * FROM health_records
       WHERE member_id = ANY($1::uuid[])
       ORDER BY created_at DESC`,
      [memberIds]
    );

    return res.json({ family_id, records: records.rows });

  } catch (err) {
    console.error("getByFamily ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.list = async (req, res) => {
  try {
    const user = req.user;
    let query = "";
    let params = [];

    // ASHA → only own health records
    if (user.role === "asha") {
      query = `
        SELECT *
        FROM health_records
        WHERE asha_worker_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.asha_id];
    }

    // ANM → health records under supervised ASHAs
    else if (user.role === "anm") {
      query = `
        SELECT hr.*
        FROM health_records hr
        JOIN user_supervision_map m 
          ON hr.asha_worker_id = m.asha_worker_id
        WHERE m.anm_worker_id = $1
        ORDER BY hr.created_at DESC
      `;
      params = [user.anm_id];
    }

    // Doctor / PHC admin → whole PHC
    else if (user.role === "doctor" || user.role === "phc_admin") {
      query = `
        SELECT *
        FROM health_records
        WHERE phc_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.phc_id];
    }

    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    const result = await pool.query(query, params);
    return res.json({ records: result.rows });

  } catch (err) {
    console.error("healthList ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
