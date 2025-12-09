const pool = require("../lib/db");

/* ============================================================
   1. ANM → CREATE NEW TASK FOR ASHA (ONLINE ASSIGNMENT)
   ============================================================ */
exports.createTask = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "anm") {
      return res.status(403).json({ error: "Only ANM can create tasks" });
    }

    const {
      asha_worker_id,
      family_id,
      member_id,
      task_type,
      title,
      description,
      due_date,
      data_json
    } = req.body;

    if (!asha_worker_id || !task_type || !title) {
      return res.status(400).json({
        error: "asha_worker_id, task_type and title are required"
      });
    }

    // Check ANM supervises this ASHA
    const checkAsha = await pool.query(
      `SELECT 1
       FROM user_supervision_map
       WHERE asha_worker_id = $1 AND anm_worker_id = $2`,
      [asha_worker_id, user.anm_id]
    );

    if (checkAsha.rowCount === 0) {
      return res.status(403).json({
        error: "This ASHA is not supervised by this ANM"
      });
    }

    let area_id = null;

    // Validate family
    if (family_id) {
      const fam = await pool.query(
        `SELECT area_id
         FROM families
         WHERE id = $1 AND asha_worker_id = $2`,
        [family_id, asha_worker_id]
      );

      if (fam.rowCount === 0) {
        return res.status(400).json({
          error: "Invalid family_id or family does not belong to this ASHA"
        });
      }

      area_id = fam.rows[0].area_id;
    }

    // Validate member
    if (member_id) {
      const mem = await pool.query(
        `SELECT m.id
         FROM family_members m
         JOIN families f ON m.family_id = f.id
         WHERE m.id = $1 AND f.asha_worker_id = $2`,
        [member_id, asha_worker_id]
      );

      if (mem.rowCount === 0) {
        return res.status(400).json({
          error: "Invalid member_id for this ASHA"
        });
      }
    }

    // Insert task
    const insert = await pool.query(
      `INSERT INTO tasks (
        phc_id,
        created_by,
        assigned_by_anm_id,
        assigned_to_asha_id,
        area_id,
        family_id,
        member_id,
        task_type,
        title,
        description,
        due_date,
        status,
        data_json
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        user.phc_id,
        user.sub,
        user.anm_id,
        asha_worker_id,
        area_id,
        family_id || null,
        member_id || null,
        task_type,
        title,
        description || null,
        due_date || null,
        "PENDING",
        data_json || null
      ]
    );

    return res.status(201).json({
      message: "Task created successfully",
      task: insert.rows[0]
    });

  } catch (err) {
    console.error("createTask ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


/* ============================================================
   2. LIST TASKS (role-based)
   ============================================================ */
exports.listTasks = async (req, res) => {
  try {
    const user = req.user;

    let query = "";
    let params = [];

    // ASHA → only tasks for her
    if (user.role === "asha") {
      query = `
        SELECT *
        FROM tasks
        WHERE assigned_to_asha_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.asha_worker_id];
    }

    // ANM → tasks she created OR her ASHAs
    else if (user.role === "anm") {
      query = `
        SELECT t.*
        FROM tasks t
        LEFT JOIN user_supervision_map m
          ON t.assigned_to_asha_id = m.asha_worker_id
        WHERE t.assigned_by_anm_id = $1
           OR m.anm_worker_id = $1
        ORDER BY t.created_at DESC
      `;
      params = [user.anm_id];
    }

    // PHC Admin / Doctor → all PHC tasks
    else if (user.role === "phc_admin" || user.role === "doctor") {
      query = `
        SELECT *
        FROM tasks
        WHERE phc_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.phc_id];
    }

    else {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const q = await pool.query(query, params);
    return res.json({ tasks: q.rows });

  } catch (err) {
    console.error("listTasks ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


/* ============================================================
   3. UPDATE TASK (ASHA, ANM, PHC)
   ============================================================ */
exports.updateTask = async (req, res) => {
  try {
    const user = req.user;
    const { task_id } = req.params;

    const { status, description, due_date, data_json } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: "task_id is required" });
    }

    const t = await pool.query(
      `SELECT * FROM tasks WHERE id = $1`,
      [task_id]
    );

    if (t.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = t.rows[0];
    let allowed = false;

    // ASHA → only tasks for her
    if (user.role === "asha" && task.assigned_to_asha_id === user.asha_worker_id) {
      allowed = true;
    }

    // ANM → if created by her OR belongs to her ASHAs
    else if (user.role === "anm") {
      const checkSupervision = await pool.query(
        `SELECT 1 
         FROM user_supervision_map
         WHERE asha_worker_id = $1 AND anm_worker_id = $2`,
        [task.assigned_to_asha_id, user.anm_id]
      );

      if (task.assigned_by_anm_id === user.anm_id || checkSupervision.rowCount > 0) {
        allowed = true;
      }
    }

    // PHC admin / doctor → full access
    else if ((user.role === "phc_admin" || user.role === "doctor") && task.phc_id === user.phc_id) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }

    const updateFields = [];
    const updateValues = [];
    let index = 1;

    if (status) {
      updateFields.push(`status = $${index++}`);
      updateValues.push(status);
    }

    if (description) {
      updateFields.push(`description = $${index++}`);
      updateValues.push(description);
    }

    if (due_date) {
      updateFields.push(`due_date = $${index++}`);
      updateValues.push(due_date);
    }

    if (data_json) {
      updateFields.push(`data_json = $${index++}`);
      updateValues.push(data_json);
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(task_id);

    const q = await pool.query(
      `UPDATE tasks
       SET ${updateFields.join(", ")}
       WHERE id = $${index}
       RETURNING *`,
      updateValues
    );

    return res.json({ message: "Task updated", task: q.rows[0] });

  } catch (err) {
    console.error("updateTask ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


/* ============================================================
   4. ASHA OFFLINE SYNC (INSERT/UPDATE USING UPSERT LOGIC)
   ============================================================ */
exports.saveTask = async (req, res) => {
  try {
    const asha = req.user;
    const data = req.body;

    // enforce ASHA fields
    data.assigned_to_asha_id = asha.asha_worker_id;
    data.phc_id = asha.phc_id;

    const existing = await pool.query(
      `SELECT * FROM tasks WHERE id = $1`,
      [data.id]
    );

    if (existing.rowCount === 0) {
      const insert = await pool.query(
        `INSERT INTO tasks (
          id, phc_id, created_by, assigned_to_asha_id,
          family_id, member_id, task_type, title, description,
          due_date, status, device_created_at, device_updated_at, synced_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
        RETURNING *`,
        [
          data.id,
          data.phc_id,
          asha.sub,
          data.assigned_to_asha_id,
          data.family_id,
          data.member_id,
          data.task_type,
          data.title,
          data.description,
          data.due_date,
          data.status || "pending",
          data.device_created_at,
          data.device_updated_at,
          new Date()
        ]
      );
      return res.json(insert.rows[0]);
    }

    const record = existing.rows[0];

    if (new Date(data.device_updated_at) > record.device_updated_at) {
      const update = await pool.query(
        `UPDATE tasks
         SET family_id=$1, member_id=$2, task_type=$3, title=$4,
             description=$5, due_date=$6, status=$7, device_updated_at=$8, synced_at=$9
         WHERE id=$10
         RETURNING *`,
        [
          data.family_id,
          data.member_id,
          data.task_type,
          data.title,
          data.description,
          data.due_date,
          data.status,
          data.device_updated_at,
          new Date(),
          data.id
        ]
      );

      return res.json(update.rows[0]);
    }

    return res.json(record);

  } catch (err) {
    console.error("saveTask ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};


/* ============================================================
   5. SIMPLE ASHA TASK LIST
   ============================================================ */
exports.getMyTasks = async (req, res) => {
  try {
    const asha = req.user;

    const q = await pool.query(
      `SELECT * 
       FROM tasks
       WHERE assigned_to_asha_id = $1
       ORDER BY due_date ASC`,
      [asha.asha_worker_id]
    );

    return res.json(q.rows);

  } catch (err) {
    console.error("getMyTasks ERROR:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
