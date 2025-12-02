const pool = require("../lib/db");

/* ===============================================
   PUSH (Offline → Server)
   =============================================== */
exports.pushFamilies = async (req, res) => {
  try {
    const user = req.user;
    const items = req.body.items || [];

    const results = [];

    for (const item of items) {
      let serverId = item.id; // may be null

      // CREATE
      if (item.dirty_operation === "CREATE") {
        const insert = await pool.query(
          `
          INSERT INTO families (
            phc_id,
            area_id,
            asha_worker_id,
            anm_worker_id,
            address_line,
            landmark,
            device_created_at,
            device_updated_at,
            created_at,
            updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
          RETURNING id
          `,
          [
            item.phc_id,
            item.area_id,
            item.asha_worker_id,
            item.anm_worker_id,
            item.address_line,
            item.landmark,
            item.device_created_at,
            item.device_updated_at,
          ]
        );

        serverId = insert.rows[0].id;
      }

      // UPDATE
      if (item.dirty_operation === "UPDATE" && item.id) {
        await pool.query(
          `
          UPDATE families
          SET 
            address_line = $1,
            landmark = $2,
            device_updated_at = $3,
            updated_at = NOW()
          WHERE id = $4
          `,
          [
            item.address_line,
            item.landmark,
            item.device_updated_at,
            item.id,
          ]
        );
      }

      // DELETE
      if (item.dirty_operation === "DELETE" && item.id) {
        await pool.query(
          `
          UPDATE families 
          SET updated_at = NOW(), deleted_at = NOW()
          WHERE id = $1
          `,
          [item.id]
        );
      }

      results.push({
        client_id: item.client_id,
        server_id: serverId,
      });
    }

    return res.json({ results });
  } catch (err) {
    console.error("Sync pushFamilies ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};


/* ===============================================
   PULL (Server → Offline Device)
   =============================================== */
exports.pullFamilies = async (req, res) => {
  try {
    const since = req.query.since || "2000-01-01";

    const data = await pool.query(
      `
      SELECT *
      FROM families
      WHERE updated_at > $1
      `,
      [since]
    );

    return res.json({ items: data.rows });
  } catch (err) {
    console.error("Sync pullFamilies ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
