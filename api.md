# API Documentation

## 1. Authentication – Login

### Endpoint
`POST /auth/login`

### Description
Authenticates a user using phone number and password.  
This endpoint is **role-agnostic** — any valid user (admin, ASHA worker, staff, etc.) can log in.

On successful authentication, a **JWT access token** is returned.  
This token must be used in the `Authorization` header for all protected APIs.

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |

---

### Request Body  example
```json
{
  "phone": "9999999999",
  "password": "admin123"
}





Perfect, understood 👍
You want **ONLY the “Create Area” section**, clean, **single copy-paste block**, assuming **auth section already exists**.

Here it is — **paste this directly where you’re continuing** in `api.md`.

---

```md
## Create Area (PHC Only)

### Endpoint
POST /phcs/areas/create

### Description
Creates a new area under the logged-in Primary Health Center (PHC).
This API is protected and can be accessed only after authentication.

Areas must be created **before** onboarding ASHA or ANM users, since workers are assigned to areas.

---

### Authentication
Required

Use JWT token received from `/auth/login`.

```

Authorization: Bearer <JWT_ACCESS_TOKEN>

````

> Token must belong to a PHC-level user.

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "area_name": "Sambhaji Nagar 2"
}
````

---

### Request Body Fields

| Field     | Type   | Required | Description                              |
| --------- | ------ | -------- | ---------------------------------------- |
| area_name | string | Yes      | Name of the area to be created under PHC |

---

### Success Response

**201 Created**

```json
{
  "message": "Area created successfully",
  "area": {
    "id": "6cc6782f-64f7-44f9-916e-b9199424d88f",
    "phc_id": "6fa8051e-a511-4788-8c12-bfe2e71ce025",
    "area_name": "Sambhaji Nagar 2",
    "created_at": "2025-12-21T06:29:02.673Z",
    "updated_at": "2025-12-21T06:29:02.673Z"
  }
}
```

---

### Error Responses

**400 Bad Request**
(Validation error – missing or invalid input)

```json
{
  "error": "Area name is required"
}
```

**401 Unauthorized**
(Missing or invalid token)

```json
{
  "error": "Unauthorized access"
}
```

**403 Forbidden**
(User is authenticated but not a PHC user)

```json
{
  "error": "Only PHC users can create areas"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Important Constraints

* User must be authenticated
* User role must be PHC
* `phc_id` is automatically derived from JWT token
* Client must not send `phc_id`
* Areas must exist before creating ASHA or ANM users

```

---

Good. This is **PHC → create worker (ANM / ASHA)**.
You want **ONE clean copy-paste block** to continue your `api.md`.
No explanations outside the doc. Here it is.

---

```md
## Create PHC Worker (ANM )

### Endpoint
POST /phc/users/create

### Description
Creates a new healthcare worker (ANM or ASHA) under the logged-in PHC.

This endpoint is protected and requires a **PHC-level JWT token**.
The worker must be assigned to **one or more existing areas** at the time of creation.

Areas must already exist before creating workers.

---

### Authentication
Required

Use JWT token received from `/auth/login` (PHC user).

```

Authorization: Bearer <JWT_ACCESS_TOKEN>

````

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "name": "Rahul-asha-1",
  "phone": "000000002",
  "role": "anm",
  "password": "anm12345",
  "areas": ["6cc6782f-64f7-44f9-916e-b9199424d88f"]
}
````

---

### Request Body Fields

| Field    | Type        | Required | Description                             |
| -------- | ----------- | -------- | --------------------------------------- |
| name     | string      | Yes      | Name of the worker                      |
| phone    | string      | Yes      | Unique phone number for login           |
| role     | string      | Yes      | Worker role (`anm` or `asha`)           |
| password | string      | Yes      | Initial login password                  |
| areas    | array(UUID) | Yes      | List of area IDs assigned to the worker |

---

### Success Response

**201 Created**

```json
{
  "message": "User created successfully",
  "user_id": "78cc12d0-de97-42c7-86f4-e2249fc31b91",
  "worker_id": "8b4a031a-9907-4cf8-afaa-8da67a1f9693",
  "role": "anm",
  "assigned_areas": [
    "6cc6782f-64f7-44f9-916e-b9199424d88f"
  ],
  "status": "active"
}
```

---

### Error Responses

**400 Bad Request**
(Missing fields or invalid input)

```json
{
  "error": "Invalid request body"
}
```

**401 Unauthorized**
(Missing or invalid JWT token)

```json
{
  "error": "Unauthorized access"
}
```

**403 Forbidden**
(User is authenticated but not PHC)

```json
{
  "error": "Only PHC users can create workers"
}
```

**404 Not Found**
(Area ID does not exist or not under PHC)

```json
{
  "error": "Invalid area ID"
}
```

**409 Conflict**
(Phone number already exists)

```json
{
  "error": "Phone number already registered"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Important Constraints

* User must be authenticated as PHC
* Areas must exist before worker creation
* Worker must be assigned at least one area
* Phone number must be unique
* PHC cannot assign workers to areas outside its scope

```

---







---

```md
## Create ASHA Worker (Requires ANM Assignment)

### Endpoint
POST /phc/users/create

### Description
Creates a new ASHA worker under the logged-in PHC.

This endpoint is protected and requires a PHC-level JWT token.

**Important:**  
An ASHA worker can be created **only if at least one ANM is already assigned to the same area(s)**.  
If no ANM exists for the provided areas, ASHA creation will be rejected.

---

### Authentication
Required

Use JWT token received from `/auth/login` (PHC user).

```

Authorization: Bearer <JWT_ACCESS_TOKEN>

````

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "name": "Rahul-asha-1",
  "phone": "000000003",
  "role": "asha",
  "password": "anm12345",
  "areas": ["6cc6782f-64f7-44f9-916e-b9199424d88f"]
}
````

---

### Request Body Fields

| Field    | Type        | Required | Description                   |
| -------- | ----------- | -------- | ----------------------------- |
| name     | string      | Yes      | Name of the ASHA worker       |
| phone    | string      | Yes      | Unique phone number for login |
| role     | string      | Yes      | Must be `asha`                |
| password | string      | Yes      | Initial login password        |
| areas    | array(UUID) | Yes      | Area IDs where ASHA will work |

---

### Success Response

**201 Created**

```json
{
  "message": "User created successfully",
  "user_id": "ecc666a3-f147-4c72-a4bb-ce1fd7ce229f",
  "worker_id": "65c54a07-a0ec-48af-9387-3283639112e3",
  "role": "asha",
  "assigned_areas": [
    "6cc6782f-64f7-44f9-916e-b9199424d88f"
  ],
  "status": "active"
}
```

---

### Error Responses

**400 Bad Request**
(Invalid input)

```json
{
  "error": "Invalid request body"
}
```

**401 Unauthorized**
(Missing or invalid JWT)

```json
{
  "error": "Unauthorized access"
}
```

**403 Forbidden**
(User is not PHC)

```json
{
  "error": "Only PHC users can create ASHA workers"
}
```

**422 Unprocessable Entity**
(No ANM assigned to the given area)

```json
{
  "error": "No ANM assigned to the selected area(s)"
}
```

**409 Conflict**
(Phone number already exists)

```json
{
  "error": "Phone number already registered"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Hierarchy Constraints

* PHC → creates ANM first
* ANM must be assigned to area(s)
* ASHA can be created **only after ANM exists in same area**
* ASHA cannot be assigned to areas without ANM supervision

```

---

