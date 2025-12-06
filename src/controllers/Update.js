// controllers/ashaUpdate.controller.js
const pool = require("../lib/db");

/**
 * Single unified ASHA update route
 * - type: "family" | "member" | "health"
 * - id: uuid of record
 * - updates: fields to update (filtered per type)
 */
exports.updateAshaEntity = async (req, res) => {
  try {
    const user = req.user;

    // 1️⃣ Only ASHA can use this route
    if (!user || user.role !== "asha") {
      return res.status(403).json({ error: "Only ASHA can update data" });
    }

    const { type, id, updates } = req.body;

    if (!type || !id || !updates || typeof updates !== "object") {
      return res.status(400).json({
        error: "type, id and updates are required"
      });
    }

    const entityType = String(type).toLowerCase();

    // 2️⃣ Allowed fields per entity
    const allowedFieldsByType = {
      family: ["area_id", "address_line", "landmark"],
      member: ["name", "gender", "age", "relation", "phone", "is_alive", "dob"],
      health: ["visit_type", "data_json", "status"]
    };

    if (!allowedFieldsByType[entityType]) {
      return res.status(400).json({ error: "Invalid type. Use 'family', 'member' or 'health'." });
    }

    const allowedFields = allowedFieldsByType[entityType];

    // Filter updates object to only allowed fields
    const fieldsToUpdate = Object.keys(updates).filter((key) =>
      allowedFields.includes(key)
    );

    if (fieldsToUpdate.length === 0) {
      return res.status(400).json({
        error: `No valid fields to update for type '${entityType}'.`
      });
    }

    // 3️⃣ Permission + table config per entity type
    let tableName;
    let permissionQuery;
    let permissionParams;

    const ashaWorkerId = user.asha_worker_id || user.asha_id; // in case you used asha_id somewhere

    if (!ashaWorkerId) {
      return res.status(400).json({
        error: "ASHA worker id missing on user (asha_worker_id / asha_id)"
      });
    }

    if (entityType === "family") {
      tableName = "families";

      // ASHA can update only her families
      permissionQuery = `
        SELECT id 
        FROM families
        WHERE id = $1 AND asha_worker_id = $2
      `;
      permissionParams = [id, ashaWorkerId];

    } else if (entityType === "member") {
      tableName = "family_members";

      // ASHA can update member only if member's family belongs to her
      permissionQuery = `
        SELECT fm.id
        FROM family_members fm
        JOIN families f ON fm.family_id = f.id
        WHERE fm.id = $1 AND f.asha_worker_id = $2
      `;
      permissionParams = [id, ashaWorkerId];

    } else if (entityType === "health") {
      tableName = "health_records";

      // ASHA can update health record only if member's family belongs to her
      permissionQuery = `
        SELECT hr.id
        FROM health_records hr
        JOIN family_members fm ON hr.member_id = fm.id
        JOIN families f ON fm.family_id = f.id
        WHERE hr.id = $1 AND f.asha_worker_id = $2
      `;
      permissionParams = [id, ashaWorkerId];
    }

    // 4️⃣ Permission check
    const permCheck = await pool.query(permissionQuery, permissionParams);
    if (permCheck.rowCount === 0) {
      return res.status(403).json({
        error: "You are not allowed to update this record"
      });
    }

    // 5️⃣ Build dynamic UPDATE query
    const setClauses = [];
    const values = [id]; // $1 = id

    fieldsToUpdate.forEach((field, index) => {
      const paramIndex = index + 2; // start from $2
      setClauses.push(`${field} = $${paramIndex}`);
      values.push(updates[field]);
    });

    // device_updated_at & updated_at auto-update if present on table
    // All 3 tables have device_updated_at + updated_at
    setClauses.push(`device_updated_at = NOW()`);
    setClauses.push(`updated_at = NOW()`);

    const updateQuery = `
      UPDATE ${tableName}
      SET ${setClauses.join(", ")}
      WHERE id = $1
      RETURNING *;
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Record not found after update" });
    }

    return res.json({
      message: `${entityType} updated successfully`,
      type: entityType,
      record: result.rows[0]
    });

  } catch (err) {
    console.error("updateAshaEntity ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message || String(err)
    });
  }
};
