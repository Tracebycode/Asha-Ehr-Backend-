const pool = require("../lib/db");


/* =======================================================
   FULL FAMILY BUNDLE (role-based)
   ======================================================= */
exports.getFullFamily = async (req, res) => {
  try {
    const user = req.user;
    const family_id = req.params.id;

    if (!family_id) {
      return res.status(400).json({ error: "family_id is required" });
    }

    // 1️⃣ Permission check (same idea as listFamilies / setHead)
    let famCheckQuery, params;

    // ASHA → only her families
    if (user.role === "asha") {
      famCheckQuery = `
        SELECT 
          f.*,
          hm.name AS head_name,
          hm.phone AS head_phone
        FROM families f
        LEFT JOIN family_members hm
          ON f.head_member_id = hm.id
        WHERE f.id = $1 AND f.asha_worker_id = $2
      `;
      params = [family_id, user.asha_worker_id];
    }

    // ANM → families under this ANM
    else if (user.role === "anm") {
      famCheckQuery = `
        SELECT 
          f.*,
          hm.name AS head_name,
          hm.phone AS head_phone
        FROM families f
        LEFT JOIN family_members hm
          ON f.head_member_id = hm.id
        WHERE f.id = $1 AND f.anm_worker_id = $2
      `;
      params = [family_id, user.anm_worker_id];
    }

    // PHC ADMIN → any family in this PHC
    else if (user.role === "phc_admin") {
      famCheckQuery = `
        SELECT 
          f.*,
          hm.name AS head_name,
          hm.phone AS head_phone
        FROM families f
        LEFT JOIN family_members hm
          ON f.head_member_id = hm.id
        WHERE f.id = $1 AND f.phc_id = $2
      `;
      params = [family_id, user.phc_id];
    }

    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    const famCheck = await pool.query(famCheckQuery, params);

    if (famCheck.rowCount === 0) {
      return res
        .status(403)
        .json({ error: "You are not allowed to view this family" });
    }

    const family = famCheck.rows[0];

    // 2️⃣ Fetch members
    const membersResult = await pool.query(
      `SELECT * FROM family_members WHERE family_id = $1 ORDER BY created_at ASC`,
      [family_id]
    );
    const members = membersResult.rows;

    // 3️⃣ Fetch health records
    const memberIds = members.map((m) => m.id);
    let healthRecords = [];

    if (memberIds.length > 0) {
      const hr = await pool.query(
        `
        SELECT *
        FROM health_records
        WHERE member_id = ANY($1)
        ORDER BY created_at DESC
        `,
        [memberIds]
      );
      healthRecords = hr.rows;
    }

    return res.json({
      family,
      members,
      health_records: healthRecords,
    });
  } catch (err) {
    console.error("getFullFamily ERROR:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
};
