const pool = require("../lib/db");

exports.addMember = async (req, res) => {
  try {
    const user = req.user;

    // 1) Only ASHA can add members
    if (user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can add members" });
    }

    const {
      family_id,
      name,
      gender,
      age,
      relation,
      phone,
      adhar_number
    } = req.body;

    // 2) Required fields
    if (!family_id || !name || !adhar_number) {
      return res.status(400).json({
        error: "family_id, name and adhar_number are required"
      });
    }

    // 3) Validate Aadhar (basic)
    if (!/^[0-9]{12}$/.test(adhar_number)) {
      return res.status(400).json({
        error: "Invalid Aadhar number. Must be 12 digits."
      });
    }

    // 4) Check duplicate Aadhar anywhere (avoid duplicate)
    const duplicate = await pool.query(
      `SELECT id FROM family_members WHERE adhar_number = $1`,
      [adhar_number]
    );

    if (duplicate.rowCount > 0) {
      return res.status(409).json({
        error: "Aadhar number already exists"
      });
    }

    // 5) Verify that this family belongs to THIS ASHA
    const fam = await pool.query(
      `SELECT id, head_member_id 
       FROM families 
       WHERE id = $1 AND asha_worker_id = $2`,
      [family_id, user.asha_id]
    );

    if (fam.rowCount === 0) {
      return res.status(403).json({
        error: "This family does not belong to this ASHA"
      });
    }

    // 6) Insert the member
    const memberInsert = await pool.query(
      `INSERT INTO family_members 
      (family_id, name, gender, age, relation, phone, adhar_number)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [family_id, name, gender, age, relation, phone, adhar_number]
    );

    const member = memberInsert.rows[0];

    // 7) Set as head only if none exists OR relation="head"
    const isHead =
      !fam.rows[0].head_member_id ||
      relation?.toLowerCase() === "head";

    if (isHead) {
      await pool.query(
        `UPDATE families
         SET head_member_id = $1
         WHERE id = $2`,
        [member.id, family_id]
      );
    }

    return res.status(201).json({
      message: "Member added successfully",
      member,
    });

  } catch (err) {
    console.error("addMember ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};


exports.getMembersByFamily = async (req, res) => {
  try {
    const user = req.user;
    const { family_id } = req.params;

    if (!family_id) {
      return res.status(400).json({ error: "family_id is required" });
    }

    let familyCheckQuery = "";
    let params = [];

    // 1️⃣ ASHA can only view her own families
    if (user.role === "asha") {
      familyCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND asha_worker_id = $2
      `;
      params = [family_id, user.asha_id];
    }

    // 2️⃣ ANM can only view families under her supervised ASHAs
    else if (user.role === "anm") {
      familyCheckQuery = `
        SELECT f.id
        FROM families f
        JOIN user_supervision_map m
          ON f.asha_worker_id = m.asha_worker_id
        WHERE f.id = $1 AND m.anm_worker_id = $2
      `;
      params = [family_id, user.anm_id];
    }

    // 3️⃣ PHC admin / Doctor → any family in their PHC
    else if (user.role === "phc_admin" || user.role === "doctor") {
      familyCheckQuery = `
        SELECT id FROM families
        WHERE id = $1 AND phc_id = $2
      `;
      params = [family_id, user.phc_id];
    }

    else {
      return res.status(403).json({ error: "Invalid role" });
    }

    // Run access check
    const famCheck = await pool.query(familyCheckQuery, params);

    if (famCheck.rowCount === 0) {
      return res.status(403).json({ error: "Not authorized to view this family" });
    }

    // 4️⃣ Fetch all members
    const members = await pool.query(
      `SELECT * FROM family_members
       WHERE family_id = $1
       ORDER BY created_at ASC`,
      [family_id]
    );

    return res.json({
      family_id,
      members: members.rows
    });

  } catch (err) {
    console.error("getMembersByFamily ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};

