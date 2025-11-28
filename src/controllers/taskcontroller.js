const pool = require("../lib/db");


exports.createTask = async (req, res) => {
  try {
    const user = req.user;

    // 1️⃣ Only ANM can assign tasks
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

    // 2️⃣ Required fields
    if (!asha_worker_id || !task_type || !title) {
      return res.status(400).json({
        error: "asha_worker_id, task_type and title are required"
      });
    }

    // 3️⃣ Check ASHA supervised by this ANM
    const checkAsha = await pool.query(
      `SELECT asha_worker_id 
       FROM user_supervision_map
       WHERE asha_worker_id = $1 AND anm_worker_id = $2`,
      [asha_worker_id, user.anm_id]
    );

    if (checkAsha.rowCount === 0) {
      return res.status(403).json({
        error: "This ASHA is not supervised by this ANM"
      });
    }

    // 4️⃣ Validate family (optional)
    let area_id = null;

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

    // 5️⃣ Validate member (optional)
    if (member_id) {
      const mem = await pool.query(
        `SELECT m.id
         FROM family_members m
         JOIN families f ON f.id = m.family_id
         WHERE m.id = $1 AND f.asha_worker_id = $2`,
        [member_id, asha_worker_id]
      );

      if (mem.rowCount === 0) {
        return res.status(400).json({
          error: "Invalid member_id for this ASHA"
        });
      }
    }

    // 6️⃣ Insert (FIXED created_by = user.sub)
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
        user.sub,              // 🔥 REAL FIX
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
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};



exports.listTasks = async (req, res) => {
  try {
    const user = req.user;

    let query = "";
    let params = [];

    // 1️⃣ ASHA — only tasks assigned to her
    if (user.role === "asha") {
      query = `
        SELECT *
        FROM tasks
        WHERE assigned_to_asha_id = $1
        ORDER BY created_at DESC
      `;
      params = [user.asha_id];
    }

    // 2️⃣ ANM — tasks created by her OR tasks assigned to her ASHAs
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

    // 3️⃣ PHC Admin / Doctor — all PHC tasks
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
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};


exports.updateTask = async (req, res) => {
  try {
    const user = req.user;
    const { task_id } = req.params;

    const {
      status,
      description,
      due_date,
      data_json
    } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: "task_id is required" });
    }

    // 1️⃣ Fetch task
    const t = await pool.query(
      `SELECT *
       FROM tasks
       WHERE id = $1`,
      [task_id]
    );

    if (t.rowCount === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = t.rows[0];

    // 2️⃣ Role-based permission checks
    let allowed = false;

    // ASHA → can update only tasks assigned to her
    if (user.role === "asha" && task.assigned_to_asha_id === user.asha_id) {
      allowed = true;
    }

    // ANM → tasks she created or her ASHA’s tasks
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

    // PHC Admin / Doctor → full access
    else if ((user.role === "phc_admin" || user.role === "doctor") && task.phc_id === user.phc_id) {
      allowed = true;
    }

    if (!allowed) {
      return res.status(403).json({ error: "Not authorized to update this task" });
    }

    // 3️⃣ Build dynamic update fields
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

    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);

    // Final value for WHERE
    updateValues.push(task_id);

    // 4️⃣ Execute update
    const q = await pool.query(
      `UPDATE tasks
       SET ${updateFields.join(", ")}
       WHERE id = $${index}
       RETURNING *`,
      updateValues
    );

    return res.json({
      message: "Task updated successfully",
      task: q.rows[0]
    });

  } catch (err) {
    console.error("updateTask ERROR:", err);
    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
};
