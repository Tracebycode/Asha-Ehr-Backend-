

# 📌 **ASHA-EHR Backend – README (v1 – Basic)**

### 📍 Overview

ASHA-EHR is a backend system designed to digitize rural healthcare workflows — focused on **PHCs, ANMs, ASHA workers, families, members & health visits**.

This repository provides:

* Secure authentication
* Strict role-based data access
* Family & member registry
* Health record logging
* Task assignment workflow

---

## 🏗️ Tech Stack

| Component | Technology                                     |
| --------- | ---------------------------------------------- |
| Language  | Node.js                                        |
| Framework | Express.js                                     |
| Database  | PostgreSQL (Supabase hosted)                   |
| Auth      | JWT                                            |
| Security  | Row-level access logic via backend role checks |

---

## 👥 User Roles Defined

| Role          | Description                                        |
| ------------- | -------------------------------------------------- |
| **PHC Admin** | Manages users, assigns areas, creates ANM/ASHA     |
| **ANM**       | Supervises ASHAs & assigns tasks to them           |
| **ASHA**      | Handles families, members & adds health visit data |
| **Doctor**    | View-only clinical access                          |

---

## 🧱 Core Features (Implemented)

### 🔐 Authentication

* Login with phone + password
* JWT token returned → used in all API calls
* Token includes `user_id, role, phc_id, anm_id, asha_id`

---

### 🗺️ PHC & Area System

* PHC creates areas (villages/blocks)
* Areas can be assigned to ANM/ASHA
* Constraint → **One Area = One ANM**

---

### 👥 User Management (PHC Admin Only)

| Task                              | Supported |
| --------------------------------- | --------- |
| Create ANM / ASHA / Doctor        | ✅         |
| Assign multiple areas             | ✅         |
| Auto-map ASHA → ANM based on area | ✅         |

---

### 🏠 Family Management

| Action        | Role                                             |
| ------------- | ------------------------------------------------ |
| Create Family | ASHA                                             |
| View Family   | ASHA (own), ANM (their ASHAs), PHC Admin, Doctor |
| Auto-link     | PHC, Area, ANM, ASHA                             |

---

### 👨‍👩‍👧 Family Members

| Action                  | Role |
| ----------------------- | ---- |
| Add Member              | ASHA |
| Validate Aadhaar        | Yes  |
| Auto-assign Family Head | Yes  |
| Change Head Later       | Yes  |

---

### 🩺 Health Records

| Action                  | Role                                 |
| ----------------------- | ------------------------------------ |
| Add visit / case        | ASHA                                 |
| Linked to               | Member, Family, Area, Task, ANM, PHC |
| Flexible JSON structure | Yes                                  |

---

### 📋 Task Management (ANM → ASHA)

* ANM assigns tasks (e.g., ANC, PNC, General household visit)
* Linked to:

  * Family
  * Member
  * Area
* Status flow ready (pending → completed → verified)

---

## 📬 API Example Flow

### 🔑 Login

```
POST /auth/login
{ phone, password }
→ Returns JWT token
```

### 🧑‍🌾 Create Family (ASHA)

```
POST /families/create
Authorization: Bearer <token>
{
  "area_id": "...",
  "address_line": "House 12",
  "landmark": "Near temple"
}
```

### 👶 Add Member

```
POST /members/add
{
  "family_id": "...",
  "name": "Sita",
  "adhar_number": "123456789012",
  "relation": "head"
}
```

### 🩺 Add Health Visit

```
POST /health/add
{
  "member_id": "...",
  "visit_type": "general",
  "data_json": { "bp": "120/80", "notes": "Fine" }
}
```

---

## 🔒 Security Model

Currently enforced at backend level:

✔ ASHA sees only her families
✔ ANM sees only her ASHA families
✔ PHC Admin sees full PHC
✔ Doctor → read-only clinical data

---

## 🧪 Testing

Use **Postman** → add header:

```
Authorization: Bearer <jwt_token>
```

---

## 🚧 Not Implemented Yet (Coming Next)

* Immunization tracking module
* Vaccination schedule engine
* Offline sync APIs
* Analytics dashboards (coverage %, missed cases)
* Supabase RLS rewrite (optional future change)

---

## 🏁 Project Status

| Module          | Status    |
| --------------- | --------- |
| Auth            | ✅         |
| Users & Areas   | ✅         |
| Family Registry | ✅         |
| Members         | ✅         |
| Health Visits   | ✅         |
| Tasks           | ✅         |
| Immunization    | ⛔ Pending |
| Dashboard       | ⛔ Pending |

---



---

# 📎 How To Run Locally

```bash
npm install
cp .env.example .env
node src/index.js
```





Just tell me what you want next 🔥
