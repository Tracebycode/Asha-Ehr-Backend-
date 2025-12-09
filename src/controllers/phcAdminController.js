exports.getHealthCases = async (req, res) => {
  try {
    const phcId = req.user.phc_id;

    const normalize = (v) =>
      v === undefined || v === null || v === "" || v === "null"
        ? null
        : v;

    let category = normalize(req.query.category);
    let anm_id = normalize(req.query.anm_id);
    let asha_id = normalize(req.query.asha_id);
    let area_id = normalize(req.query.area_id);
    let risk_level = normalize(req.query.risk_level);
    let date_from = normalize(req.query.date_from);
    let date_to = normalize(req.query.date_to);
    let q = normalize(req.query.q);

    const where = ["hr.phc_id = $1"];
    const params = [phcId];

    // category = ANC (supports ANC-1 / ANC-2)
    if (category) {
      params.push(${category}%);
      where.push(LOWER(hr.visit_type) LIKE LOWER($${params.length}));
    }

    if (risk_level) {
      params.push(risk_level);
      where.push(hr.data_json->>'risk_level' = $${params.length});
    }

    if (area_id) {
      params.push(area_id);
      where.push(f.area_id = $${params.length});
    }

    if (anm_id) {
      params.push(anm_id);
      where.push(f.anm_worker_id = $${params.length});
    }

    if (asha_id) {
      params.push(asha_id);
      where.push(f.asha_worker_id = $${params.length});
    }

    if (date_from) {
      params.push(date_from);
      where.push(hr.created_at >= $${params.length});
    }

    if (date_to) {
      params.push(date_to);
      where.push(hr.created_at <= $${params.length});
    }

    if (q && q.trim() !== "") {
      params.push(%${q}%);
      where.push((fm.name ILIKE $${params.length} OR fm.phone ILIKE $${params.length}));
    }

    const query = `
      SELECT 
        hr.id,
        hr.status,
        hr.visit_type,
        hr.created_at,
        hr.data_json AS data_json,

        fm.id AS member_id,
        fm.name AS patient_name,
        fm.age,
        fm.gender,

        hr.data_json->>'risk_level' AS risk_level,

        f.id AS family_id,
        f.address_line,
        f.landmark,
        f.area_id,
        pa.area_name,

        f.asha_worker_id,
        aw.id AS asha_id,
        u_asha.name AS asha_name,

        f.anm_worker_id,
        anm.id AS anm_id,
        u_anm.name AS anm_name

      FROM health_records hr
      JOIN family_members fm ON fm.id = hr.member_id
      JOIN families f ON f.id = fm.family_id
      LEFT JOIN phc_areas pa ON pa.id = f.area_id
      LEFT JOIN asha_workers aw ON aw.id = f.asha_worker_id
      LEFT JOIN users u_asha ON u_asha.id = aw.user_id
      LEFT JOIN anm_workers anm ON anm.id = f.anm_worker_id
      LEFT JOIN users u_anm ON u_anm.id = anm.user_id
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
