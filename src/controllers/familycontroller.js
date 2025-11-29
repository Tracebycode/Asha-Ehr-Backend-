const pool = require("../lib/db");

// POST /families/create
exports.createFamily = async (req, res) => {
  try {
    const user = req.user; // from auth middleware

    // 1) Only ASHA can create families
    if (user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can create families" });
    }

    const { area_id, address_line, landmark } = req.body;

    if (!area_id) {
      return res.status(400).json({ error: "area_id is required" });
    }

    // 2) Find ANM supervising this ASHA
    const anmResult = await pool.query(
      "SELECT anm_worker_id FROM user_supervision_map WHERE asha_worker_id = $1",
      [user.asha_id]
    );

    if (anmResult.rowCount === 0) {
      return res.status(400).json({
        error: "No ANM mapped to this ASHA. Please set supervision mapping first.",
      });
    }

    const anm_id = anmResult.rows[0].anm_worker_id;

    // 3) Insert family
    const insertResult = await pool.query(
      `INSERT INTO families (
        phc_id,
        area_id,
        asha_worker_id,
        anm_worker_id,
        address_line,
        landmark
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [user.phc_id, area_id, user.asha_id, anm_id, address_line || null, landmark || null]
    );

    const family = insertResult.rows[0];

    return res.status(201).json({
      message: "Family created successfully",
      family,
    });
  } catch (err) {
    console.error("createFamily ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};


exports.listFamilies = async (req, res) => {
  try {
    const user = req.user;
    let query = "";
    let params = [];

    // PHC ADMIN + DOCTOR => sees all families of their PHC
    if (user.role === "phc_admin" || user.role === "doctor") {
      query = `
        SELECT * FROM families
        WHERE phc_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.phc_id];
    }

    // ANM => sees families where anm_worker_id = their anm_id
    else if (user.role === "anm") {
      query = `
        SELECT *
        FROM families
        WHERE anm_worker_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.anm_id];
    }

    // ASHA => sees only their families
    else if (user.role === "asha") {
      query = `
        SELECT *
        FROM families
        WHERE asha_worker_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.asha_id];
    }

    else {
      return res.status(403).json({ error: "Unknown role" });
    }

    const q = await pool.query(query, params);
    return res.json({ families: q.rows });

  } catch (err) {
    console.error("listFamilies ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};



exports.setHead = async (req, res) => {
  try {
    const user = req.user;
    const { family_id, member_id } = req.params;

    // 1️⃣ Validate input
    if (!family_id || !member_id) {
      return res.status(400).json({ error: "family_id and member_id required" });
    }

    let famCheckQuery = "";
    let params = [];

    // 2️⃣ ASHA -> only own family
    if (user.role === "asha") {
      famCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND asha_worker_id = $2
      `;
      params = [family_id, user.asha_id];
    }

    // 3️⃣ ANM -> families under supervised ASHAs
    else if (user.role === "anm") {
      famCheckQuery = `
        SELECT f.id
        FROM families f
        JOIN user_supervision_map m ON f.asha_worker_id = m.asha_worker_id
        WHERE f.id = $1 AND m.anm_worker_id = $2
      `;
      params = [family_id, user.anm_id];
    }

    // 4️⃣ PHC admin / doctor -> any family in their PHC
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

    // 5️⃣ Permission check
    const famCheck = await pool.query(famCheckQuery, params);

    if (famCheck.rowCount === 0) {
      return res.status(403).json({ error: "Not allowed to modify this family" });
    }

    // 6️⃣ Confirm member belongs to this family
    const memCheck = await pool.query(
      `SELECT id FROM family_members
       WHERE id = $1 AND family_id = $2`,
      [member_id, family_id]
    );

    if (memCheck.rowCount === 0) {
      return res.status(400).json({
        error: "Member does not belong to this family"
      });
    }

    // 7️⃣ Update the head
    await pool.query(
      `UPDATE families
       SET head_member_id = $1
       WHERE id = $2`,
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
