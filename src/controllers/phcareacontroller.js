const pool = require("../lib/db");

// =============== CREATE AREA ==================
exports.createArea = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "phc_admin") {
      return res.status(403).json({ error: "Only PHC admin can create areas" });
    }

    const { area_name } = req.body;

    if (!area_name || !area_name.trim()) {
      return res.status(400).json({ error: "area_name is required" });
    }

    const q = await pool.query(
      `
      INSERT INTO phc_areas (phc_id, area_name, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      RETURNING *
      `,
      [user.phc_id, area_name.trim()]
    );

    return res.status(201).json({
      message: "Area created successfully",
      area: q.rows[0],
    });

  } catch (err) {
    console.error("createArea ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};


// =============== LIST AREAS ==================
exports.listAreas = async (req, res) => {
  try {
    const user = req.user;
    let query;
    let params;

    // PHC ADMIN and DOCTOR → list all areas under same PHC
    if (user.role === "phc_admin" || user.role === "doctor") {
      query = `
        SELECT *
        FROM phc_areas
        WHERE phc_id = $1
        ORDER BY area_name ASC
      `;
      params = [user.phc_id];
    }

    // ANM or ASHA → list only assigned areas
    else if (user.role === "anm" || user.role === "asha") {
      query = `
        SELECT a.*
        FROM phc_areas a
        JOIN user_area_map uam ON uam.area_id = a.id
        WHERE uam.user_id = $1
        ORDER BY a.area_name ASC
      `;
      params = [user.sub];
    }

    else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const q = await pool.query(query, params);
    return res.json({ areas: q.rows });

  } catch (err) {
    console.error("listAreas ERROR:", err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
};
