const pool = require("../lib/db");

// =======================
// 1. GET ALL ASHA WORKERS
// =======================
exports.getAllAshaWorkers = async (req, res) => {
  try {
    const phcId = req.user.phc_id;

    const query = `
      SELECT 
        hr.id AS id,
        hr.status,
        hr.visit_type,
        fm.name   AS patient_name,
        fm.age,
        fm.gender,

        -- whole form payload
        hr.data_json,

        -- convenience fields
        hr.data_json->>'risk_level'           AS risk_level,
        hr.data_json->>'gravida'              AS gravida,
        hr.data_json->>'para'                 AS para,
        hr.data_json->>'living'               AS living,
        hr.data_json->>'abortions'            AS abortions,
        hr.data_json->>'lmpDate'              AS lmp_date,
        hr.data_json->>'eddDate'              AS edd_date,
        hr.data_json->>'bp'                   AS bp,
        hr.data_json->>'weight'               AS weight,
        hr.data_json->>'hemoglobin'           AS hemoglobin,
        hr.data_json->>'bloodSugar'           AS blood_sugar,
        hr.data_json->>'ifaTablets'           AS ifa_tablets,
        hr.data_json->>'calciumTablets'       AS calcium_tablets,
        hr.data_json->>'selectedVaccineDose'  AS selected_vaccine_dose,
        hr.data_json->>'vaccinationDate'      AS vaccination_date,
        hr.data_json->>'symptoms'             AS symptoms,
        hr.data_json->>'otherSymptoms'        AS other_symptoms,
        hr.data_json->>'previousCesarean'     AS previous_cesarean,
        hr.data_json->>'previousStillbirth'   AS previous_stillbirth,
        hr.data_json->>'previousComplications' AS previous_complications,

        -- family / area / worker info
        f.id          AS family_id,
        f.address_line,
        pa.area_name,
        asha_u.name   AS asha_name,
        anm_u.name    AS anm_name

      FROM health_records hr
      JOIN family_members fm ON fm.id = hr.member_id
      JOIN families f        ON f.id = fm.family_id
      LEFT JOIN phc_areas pa ON pa.id = f.area_id
      LEFT JOIN asha_workers aw ON aw.id = f.asha_worker_id
      LEFT JOIN users asha_u    ON asha_u.id = aw.user_id
      LEFT JOIN anm_workers anm ON anm.id = f.anm_worker_id
      LEFT JOIN users anm_u     ON anm_u.id = anm.user_id
      WHERE hr.phc_id = $1
      ORDER BY hr.created_at DESC;
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


// ===================================
// 7. GENERIC HEALTH CASE LIST FOR PHC
// ===================================
exports.getHealthCases = async (req, res) => {
  try {
    const phcId = req.user.phc_id;

    // filters coming from /api/phc/cases
    const {
      category,    // e.g. "ANC"
      anm_id,
      asha_id,
      area_id,
      risk_level,
      date_from,
      date_to,
      q,           // search text
    } = req.query;

    // dynamic WHERE clause
    const where = ["hr.phc_id = $1"];
    const params = [phcId];

    if (category) {
      params.push(category);
      where.push(`hr.visit_type = $${params.length}`);      // adjust if you store ANC differently
    }

    if (risk_level) {
      params.push(risk_level);
      where.push(`hr.data_json->>'risk_level' = $${params.length}`);
    }

    if (area_id) {
      params.push(area_id);
      where.push(`f.area_id = $${params.length}`);
    }

    if (anm_id) {
      params.push(anm_id);
      where.push(`f.anm_worker_id = $${params.length}`);
    }

    if (asha_id) {
      params.push(asha_id);
      where.push(`f.asha_worker_id = $${params.length}`);
    }

    if (date_from) {
      params.push(date_from);
      where.push(`hr.created_at >= $${params.length}`);
    }

    if (date_to) {
      params.push(date_to);
      where.push(`hr.created_at <= $${params.length}`);
    }

    if (q) {
      params.push(`%${q}%`);
      where.push(
        `(fm.name ILIKE $${params.length} OR fm.phone ILIKE $${params.length})`
      );
    }

    const query = `
      SELECT 
        hr.id,
        hr.status,
        hr.visit_type,
        hr.created_at,

        -- 🔹 FULL ANC FORM DATA (JSON)
        hr.data_json,

        -- member / patient
        fm.id        AS member_id,
        fm.name      AS patient_name,
        fm.age,
        fm.gender,

        -- risk (from JSON)
        hr.data_json->>'risk_level' AS risk_level,

        -- family + area
        f.id          AS family_id,
        f.address_line,
        f.landmark,
        f.area_id,
        pa.area_name,

        -- ASHA
        f.asha_worker_id,
        aw.id         AS asha_id,
        u_asha.name   AS asha_name,

        -- ANM
        f.anm_worker_id,
        anm.id        AS anm_id,
        u_anm.name    AS anm_name
      FROM health_records hr
      JOIN family_members fm ON fm.id = hr.member_id
      JOIN families       f  ON f.id  = fm.family_id
      LEFT JOIN phc_areas     pa    ON pa.id   = f.area_id
      LEFT JOIN asha_workers  aw    ON aw.id   = f.asha_worker_id
      LEFT JOIN users         u_asha ON u_asha.id = aw.user_id
      LEFT JOIN anm_workers   anm   ON anm.id  = f.anm_worker_id
      LEFT JOIN users         u_anm ON u_anm.id = anm.user_id
      WHERE ${where.join(" AND ")}
      ORDER BY hr.created_at DESC;
    `;

    const { rows } = await pool.query(query, params);
    return res.json(rows);
  } catch (error) {
    console.error("getHealthCases error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
