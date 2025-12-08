const pool = require("../lib/db");

/* =======================================================
   CREATE FAMILY (ASHA only)
   ======================================================= */
exports.createFamily = async (req, res) => {
  try {
    const user = req.user;

    // 1️⃣ Only ASHA can create families
    if (user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can create families" });
    }

    const { area_id, address_line, landmark } = req.body;

    if (!area_id) {
      return res.status(400).json({ error: "area_id is required" });
    }

    // 2️⃣ Find ANM supervising this ASHA
    const anmResult = await pool.query(
      `
      SELECT anm_worker_id 
      FROM user_supervision_map 
      WHERE asha_worker_id = $1
      `,
      [user.asha_worker_id]
    );

    if (anmResult.rowCount === 0) {
      return res.status(400).json({
        error: "No ANM mapped to this ASHA. Please set supervision mapping first.",
      });
    }

    const anm_worker_id = anmResult.rows[0].anm_worker_id;

    // 3️⃣ Insert family
    const insertResult = await pool.query(
      `
      INSERT INTO families (
        phc_id,
        area_id,
        asha_worker_id,
        anm_worker_id,
        address_line,
        landmark,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
      `,
      [
        user.phc_id,
        area_id,
        user.asha_worker_id,
        anm_worker_id,
        address_line || null,
        landmark || null,
      ]
    );

    return res.status(201).json({
      message: "Family created successfully",
      family: insertResult.rows[0],
    });
  } catch (err) {
    console.error("createFamily ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

/* =======================================================
   LIST FAMILIES (role-based)
   ======================================================= */
exports.listFamilies = async (req, res) => {
  try {
    const user = req.user;
    let query, params;

    // PHC ADMIN
    if (user.role === "phc_admin") {
      query = `
        SELECT f.*, fm.name AS head_name
        FROM families f
        LEFT JOIN family_members fm
          ON fm.id = f.head_member_id
        WHERE f.phc_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [user.phc_id];
    }

    // ANM
    else if (user.role === "anm") {
      query = `
        SELECT f.*, fm.name AS head_name
        FROM families f
        LEFT JOIN family_members fm
          ON fm.id = f.head_member_id
        WHERE f.anm_worker_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [user.anm_worker_id];
    }

    // ASHA
    else if (user.role === "asha") {
      query = `
        SELECT f.*, fm.name AS head_name
        FROM families f
        LEFT JOIN family_members fm
          ON fm.id = f.head_member_id
        WHERE f.asha_worker_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [user.asha_worker_id];
    }

    else {
      return res.status(403).json({ error: "Unknown role" });
    }

    const q = await pool.query(query, params);
    return res.json({ families: q.rows });

  } catch (err) {
    console.error("listFamilies ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};

/* =======================================================
   SET HEAD OF FAMILY (role based)
   ======================================================= */
exports.setHead = async (req, res) => {
  try {
    const user = req.user;
    const { family_id, member_id } = req.params;

    if (!family_id || !member_id) {
      return res.status(400).json({ error: "family_id and member_id required" });
    }

    let famCheckQuery, params;

    // ASHA -> own families only
    if (user.role === "asha") {
      famCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND asha_worker_id = $2
      `;
      params = [family_id, user.asha_worker_id];
    }

    // ANM -> families under supervised ASHA workers
    else if (user.role === "anm") {
      famCheckQuery = `
        SELECT f.id
        FROM families f
        JOIN user_supervision_map m ON f.asha_worker_id = m.asha_worker_id
        WHERE f.id = $1 AND m.anm_worker_id = $2
      `;
      params = [family_id, user.anm_worker_id];
    }

    // PHC ADMIN -> all families in PHC
    else if (user.role === "phc_admin") {
      famCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND phc_id = $2
      `;
      params = [family_id, user.phc_id];
    }

    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    // Permission Check
    const famCheck = await pool.query(famCheckQuery, params);

    if (famCheck.rowCount === 0) {
      return res.status(403).json({ error: "Not allowed to modify this family" });
    }

    // Confirm member belongs to this family
    const memberCheck = await pool.query(
      `
      SELECT id FROM family_members
      WHERE id = $1 AND family_id = $2
      `,
      [member_id, family_id]
    );

    if (memberCheck.rowCount === 0) {
      return res.status(400).json({
        error: "Member does not belong to this family"
      });
    }

    // Update head
    await pool.query(
      `
      UPDATE families
      SET head_member_id = $1, updated_at = NOW()
      WHERE id = $2
      `,
      [member_id, family_id]
    );

    return res.json({
      message: "Head of family updated",
      family_id,
      head_member_id: member_id
    });

  } catch (err) {
    console.error("setHead ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

/* =======================================================
   FULL FAMILY BUNDLE
   ======================================================= */
exports.getFullFamily = async (req, res) => {
  try {
    const user = req.user;
    const family_id = req.params.id;

    if (!family_id) {
      return res.status(400).json({ error: "family_id is required" });
    }

    // 1️⃣ Permission Check
    const famCheck = await pool.query(
      `
      SELECT 
        f.*,
        hm.name AS head_name,
        hm.phone AS head_phone
      FROM families f
      LEFT JOIN family_members hm
        ON f.head_member_id = hm.id
      WHERE f.id = $1 AND f.asha_worker_id = $2
      `,
      [family_id, user.asha_worker_id]   // FIXED
    );

    if (famCheck.rowCount === 0) {
      return res.status(403).json({ error: "You are not allowed to view this family" });
    }

    const family = famCheck.rows[0];

    // 2️⃣ Fetch members
    const membersResult = await pool.query(
      `SELECT * FROM family_members WHERE family_id = $1 ORDER BY created_at ASC`,
      [family_id]
    );

    const members = membersResult.rows;

    // 3️⃣ Fetch health records
    const memberIds = members.map(m => m.id);
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
      health_records: healthRecords
    });

  } catch (err) {
    console.error("getFullFamily ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

/* =======================================================
   SEARCH FAMILIES (ASHA only)
   ======================================================= */
exports.searchFamilies = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can search families" });
    }

    const search = req.query.search ? `%${req.query.search}%` : "%%";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        f.id,
        f.address_line,
        f.landmark,
        f.updated_at,
        hm.name AS head_name,
        hm.phone AS head_phone
      FROM families f
      LEFT JOIN family_members hm
        ON f.head_member_id = hm.id
      WHERE f.asha_worker_id = $1
        AND (
          hm.name ILIKE $2 OR
          hm.phone ILIKE $2 OR
          f.address_line ILIKE $2 OR
          CAST(f.id AS TEXT) ILIKE $2
        )
      ORDER BY f.updated_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [
      user.asha_worker_id,  // FIXED
      search,
      limit,
      offset
    ]);

    return res.json({
      page,
      limit,
      count: result.rowCount,
      families: result.rows,
    });

  } catch (err) {
    console.error("searchFamilies ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err?.message || String(err),
    });
  }
};
