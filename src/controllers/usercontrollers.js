//only allowed for the Phc to create new user and assign roles and CreateAcoount

// const { hashPassword } = require("../lib/password");
// const pool = require("../lib/db");


// exports.createUser = async (req, res) => {
//   const admin = req.user;

//   if (admin.role !== "phc_admin")
//     return res.status(403).json({ error: "Not authorized" });

//   const { name, phone, role, password } = req.body;

//   const hashed = await hashPassword(password);

//   const q = await pool.query(
//     `INSERT INTO users (name, phone, role, phc_id, password_hash, created_by, status)
//      VALUES ($1, $2, $3, $4, $5, $6, 'active')
//      RETURNING id`,
//     [name, phone, role, admin.phc_id, hashed, admin.sub]
//   );

//   const user_id = q.rows[0].id;

//   if (role === "asha") {
//     await pool.query("INSERT INTO asha_workers (user_id) VALUES ($1)", [user_id]);
//   }

//   if (role === "anm") {
//     await pool.query("INSERT INTO anm_workers (user_id) VALUES ($1)", [user_id]);
//   }

//   return res.json({ message: "User created", user_id });
// };


//JWT Payload
// {
//   "sub": "user_id",
//   "role": "asha | anm | doctor | phc_admin",
//   "phc_id": "phc_uuid",
//   "asha_id": "asha_worker_uuid or null",
//   "anm_id": "anm_worker_uuid or null",
//   "status": "active",
//   "iat": 123,
//   "exp": 123
// }





const pool = require("../lib/db");
const { hashPassword } = require("../lib/password");

// POST /phc/users/create
exports.createUser = async (req, res) => {
  const client = await pool.connect();

  try {
    const admin = req.user;

    // Only PHC admin
    if (admin.role !== "phc_admin") {
      return res.status(403).json({ error: "Only PHC admin can create users" });
    }

    const {
      name,
      phone,
      role,
      password,
      areas,     // required for ASHA/ANM
      gender,
      dob,
      education_level
    } = req.body;

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
        error: "areas[] is required for ANM or ASHA"
      });
    }

    const password_hash = await hashPassword(password);

    await client.query("BEGIN");

    // ---------------------------------------------------
    // 1) CREATE USER
    // ---------------------------------------------------
    const userResult = await client.query(
      `INSERT INTO users (
        name, phone, role, phc_id,
        password_hash, gender, dob,
        education_level, status, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)
      RETURNING id`,
      [
        name,
        phone,
        role,
        admin.phc_id,
        password_hash,
        gender || null,
        dob || null,
        education_level || null,
        admin.id // created_by = PHC Admin ID
      ]
    );

    const user_id = userResult.rows[0].id;
    let worker_id = null;

    // ---------------------------------------------------
    // 2) CREATE WORKER PROFILE
    // ---------------------------------------------------
    if (role === "asha") {
      const r = await client.query(
        `INSERT INTO asha_workers (user_id)
         VALUES ($1)
         RETURNING id`,
        [user_id]
      );
      worker_id = r.rows[0].id;
    }

    if (role === "anm") {
      const r = await client.query(
        `INSERT INTO anm_workers (user_id)
         VALUES ($1)
         RETURNING id`,
        [user_id]
      );
      worker_id = r.rows[0].id;
    }

    // ---------------------------------------------------
    // 3) AREA ASSIGNMENT
    // ---------------------------------------------------
    if (role === "anm" || role === "asha") {
      // Validate areas belong to this PHC
      const check = await client.query(
        `SELECT id FROM phc_areas
         WHERE id = ANY($1::uuid[]) AND phc_id = $2`,
        [areas, admin.phc_id]
      );

      if (check.rowCount !== areas.length) {
        throw new Error("One or more areas do not belong to your PHC");
      }

      // ANM: ensure no area conflict
      if (role === "anm") {
        const conflict = await client.query(
          `SELECT a.area_name, u.name AS existing_anm
           FROM user_area_map uam
           JOIN users u ON uam.user_id = u.id
           JOIN phc_areas a ON a.id = uam.area_id
           WHERE u.role='anm'
           AND uam.area_id = ANY($1::uuid[])`,
          [areas]
        );

        if (conflict.rowCount > 0) {
          return res.status(400).json({
            error: "Some areas already assigned to another ANM",
            conflicts: conflict.rows
          });
        }
      }

      // Assign areas
      for (const area of areas) {
        await client.query(
          `INSERT INTO user_area_map (user_id, area_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [user_id, area]
        );
      }
    }

    // ---------------------------------------------------
    // 4) ASHA SUPERVISION MAPPING
    // ---------------------------------------------------
    if (role === "asha") {
      const findAnm = await client.query(
        `SELECT DISTINCT aw.id AS anm_worker_id
         FROM user_area_map uam
         JOIN users u ON u.id = uam.user_id AND u.role='anm'
         JOIN anm_workers aw ON aw.user_id = u.id
         WHERE uam.area_id = ANY($1::uuid[])`,
        [areas]
      );

      if (findAnm.rowCount === 0) {
        throw new Error("No ANM assigned to these areas. Assign ANM first.");
      }

      const uniqueAnm = [...new Set(findAnm.rows.map(r => r.anm_worker_id))];

      if (uniqueAnm.length > 1) {
        throw new Error("Areas belong to different ANMs.");
      }

      await client.query(
        `INSERT INTO user_supervision_map (anm_worker_id, asha_worker_id)
         VALUES ($1, $2)
         ON CONFLICT (asha_worker_id)
         DO UPDATE SET anm_worker_id = EXCLUDED.anm_worker_id`,
        [uniqueAnm[0], worker_id]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "User created successfully",
      user_id,
      worker_id,
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
