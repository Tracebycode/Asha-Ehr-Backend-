const pool = require("../lib/db");
const { hashPassword } = require("../lib/password");

// POST /phc/users/create
exports.createUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const admin = req.user;

    if (admin.role !== "phc_admin") {
      return res.status(403).json({ error: "Only PHC admin can create users" });
    }

    const {
      name,
      phone,
      role,
      password,
      areas,             // required ONLY for ASHA/ANM
      gender,
      dob,
      education_level,
      specialization,    // for doctors
      license_number     // for doctors
    } = req.body;

    // -------------------------
    // BASIC VALIDATIONS
    // -------------------------
    if (!name || !phone || !role || !password) {
      return res.status(400).json({
        error: "name, phone, role, password are required"
      });
    }

    if (!["phc_admin", "doctor", "anm", "asha"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if ((role === "anm" || role === "asha") && (!areas || areas.length === 0)) {
      return res.status(400).json({
        error: "areas[] is required for ANM/ASHA"
      });
    }

    const password_hash = await hashPassword(password);

    await client.query("BEGIN");

    // ---------------------------------------------------
    // 1) INSERT INTO USERS
    // ---------------------------------------------------
    const userRes = await client.query(
      `
      INSERT INTO users (
        name, phone, role, phc_id, password_hash,
        gender, dob, education_level,
        status, created_by, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,NOW(),NOW())
      RETURNING id
      `,
      [
        name,
        phone,
        role,
        admin.phc_id,
        password_hash,
        gender || null,
        dob || null,
        education_level || null,
        admin.sub
      ]
    );

    const user_id = userRes.rows[0].id;
    let worker_id = null;

    // ---------------------------------------------------
    // 2) CREATE ROLE-SPECIFIC WORKER ENTRY
    // ---------------------------------------------------
    if (role === "asha") {
      const r = await client.query(
        `INSERT INTO asha_workers (user_id, created_at)
         VALUES ($1, NOW())
         RETURNING id`,
        [user_id]
      );
      worker_id = r.rows[0].id;
    }

    if (role === "anm") {
      const r = await client.query(
        `INSERT INTO anm_workers (user_id, created_at)
         VALUES ($1, NOW())
         RETURNING id`,
        [user_id]
      );
      worker_id = r.rows[0].id;
    }

    if (role === "doctor") {
      const r = await client.query(
        `
        INSERT INTO doctor_workers (user_id, specialization, license_number, created_at)
        VALUES ($1,$2,$3,NOW())
        RETURNING id
        `,
        [user_id, specialization || null, license_number || null]
      );
      worker_id = r.rows[0].id;
    }

    // ---------------------------------------------------
    // 3) AREA ASSIGNMENT (ANM / ASHA only)
    // ---------------------------------------------------
    if (role === "anm" || role === "asha") {
      // Check areas belong to same PHC
      const check = await client.query(
        `
        SELECT id FROM phc_areas
        WHERE id = ANY($1::uuid[]) AND phc_id = $2
        `,
        [areas, admin.phc_id]
      );

      if (check.rowCount !== areas.length) {
        throw new Error("Invalid area(s): Some areas not in your PHC");
      }

      // ANM → ensure no conflicts
      if (role === "anm") {
        const conflict = await client.query(
          `
          SELECT a.area_name, u.name AS assigned_anm
          FROM user_area_map uam
          JOIN users u ON u.id = uam.user_id
          JOIN phc_areas a ON a.id = uam.area_id
          WHERE u.role='anm'
          AND uam.area_id = ANY($1::uuid[])
        `,
          [areas]
        );

        if (conflict.rowCount > 0) {
          return res.status(400).json({
            error: "Some areas already assigned to another ANM",
            conflicts: conflict.rows
          });
        }
      }

      // Insert area mappings
      for (const area of areas) {
        await client.query(
          `
          INSERT INTO user_area_map (user_id, area_id, assigned_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT DO NOTHING
          `,
          [user_id, area]
        );
      }
    }

    // ---------------------------------------------------
    // 4) SUPERVISION LOGIC → Assign ANM to ASHA
    // ---------------------------------------------------
    if (role === "asha") {
      const findAnm = await client.query(
        `
        SELECT DISTINCT aw.id AS anm_worker_id
        FROM user_area_map uam
        JOIN users u ON u.id = uam.user_id AND u.role='anm'
        JOIN anm_workers aw ON aw.user_id = u.id
        WHERE uam.area_id = ANY($1::uuid[])
        `,
        [areas]
      );

      if (findAnm.rowCount === 0) {
        throw new Error("No ANM found for these areas. Assign ANM first.");
      }

      const uniqueAnm = [...new Set(findAnm.rows.map(r => r.anm_worker_id))];

      if (uniqueAnm.length > 1) {
        throw new Error("Multiple ANMs found for assigned areas — invalid configuration.");
      }

      await client.query(
        `
        INSERT INTO user_supervision_map (anm_worker_id, asha_worker_id, created_at)
        VALUES ($1, $2, NOW())
        `,
        [uniqueAnm[0], worker_id]
      );
    }

    // ---------------------------------------------------
    // FINISH
    // ---------------------------------------------------
    await client.query("COMMIT");

    return res.status(201).json({
      message: "User created successfully",
      user_id,
      worker_id,
      role,
      assigned_areas: areas || [],
      status: "active"
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("createUser ERROR:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};
