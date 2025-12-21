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










````md
## Universal Login (PHC / ANM / ASHA)

### Endpoint
POST /auth/login

### Description
Universal authentication endpoint for all user roles in the system.

This single login route is used by:
- PHC users
- ANM workers
- ASHA workers

On successful login, a **JWT token** is returned.  
This token is required to access all protected APIs based on the user’s role.

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |

---

### Request Body
```json
{
  "phone": "0000000002",
  "password": "anm12345"
}
````

---

### Request Body Fields

| Field    | Type   | Required | Description                         |
| -------- | ------ | -------- | ----------------------------------- |
| phone    | string | Yes      | Registered phone number of the user |
| password | string | Yes      | User password                       |

---

### Success Response

**200 OK**

```json
{
  "token": "<JWT_ACCESS_TOKEN>"
}
```

---

### Token Details

* Token is a **JWT**
* Token contains:

  * user_id
  * role (phc / anm / asha)
  * phc_id (derived internally)
* Token is **stateless**
* Same token format is used across all roles

---

### Token Usage

For all protected APIs, include the token in request headers:

```
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

Authorization and access control are enforced based on the **role encoded in the token**.

---

### Error Responses

**400 Bad Request**
(Missing credentials)

```json
{
  "error": "Phone and password are required"
}
```

**401 Unauthorized**
(Invalid credentials)

```json
{
  "error": "Invalid phone or password"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Important Notes

* Separate login routes are **not required** for different roles
* Role-based access is handled after token verification
* Same login flow is used across web and mobile clients











---

```md
## Create Family (ASHA Only)

### Endpoint
POST /families/create

### Description
Creates a new family record under a specific area.

This endpoint is **restricted to ASHA workers only**.  
Only an authenticated ASHA user can create families for the areas assigned to them.

The ASHA must already be:
- Assigned to the area
- Supervised by an ANM
- Under a PHC hierarchy

---

### Authentication
Required

Use JWT token received from `/auth/login` **for ASHA user only**.

```

Authorization: Bearer <ASHA_JWT_ACCESS_TOKEN>

````

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<ASHA_JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "area_id": "6cc6782f-64f7-44f9-916e-b9199424d88f",
  "address_line": "House No 24",
  "landmark": "Near main road"
}
````

---

### Request Body Fields

| Field        | Type   | Required | Description                   |
| ------------ | ------ | -------- | ----------------------------- |
| area_id      | UUID   | Yes      | Area where the family belongs |
| address_line | string | Yes      | House address                 |
| landmark     | string | No       | Nearby landmark               |

---

### Success Response

**201 Created**

```json
{
  "message": "Family created successfully",
  "family": {
    "id": "5ed195e0-4499-4713-a1c7-8d9078e42500",
    "phc_id": "6fa8051e-a511-4788-8c12-bfe2e71ce025",
    "area_id": "6cc6782f-64f7-44f9-916e-b9199424d88f",
    "asha_worker_id": "e8f570b6-945d-4a60-82a4-f809c7931786",
    "anm_worker_id": "8b4a031a-9907-4cf8-afaa-8da67a1f9693",
    "head_member_id": null,
    "address_line": "House No 24",
    "landmark": "Near main road"
  }
}
```

---

### Error Responses

**400 Bad Request**
(Invalid or missing fields)

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
(User is not ASHA)

```json
{
  "error": "Only ASHA workers can create families"
}
```

**404 Not Found**
(Area not found or not assigned to ASHA)

```json
{
  "error": "Invalid area ID"
}
```

**422 Unprocessable Entity**
(No ANM assigned for the area)

```json
{
  "error": "No ANM assigned to this area"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Hierarchy & Access Constraints

* Only ASHA users can create families
* ASHA must be assigned to the area
* ANM must exist for the area
* PHC is derived internally from ASHA token
* Client must not send `phc_id`, `asha_worker_id`, or `anm_worker_id`

```

---




---

```md
## Add Family Member (ASHA Only)

### Endpoint
POST /families/add/members

### Description
Adds a new member to an existing family.

This endpoint is **restricted to ASHA workers only**.  
Only the ASHA who created (or is assigned to) the family can add members to it.

The family must already exist and belong to the ASHA’s assigned area.

---

### Authentication
Required

Use JWT token received from `/auth/login` **for ASHA user only**.

```

Authorization: Bearer <ASHA_JWT_ACCESS_TOKEN>

````

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<ASHA_JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "family_id": "5ed195e0-4499-4713-a1c7-8d9078e42500",
  "name": "Rohan Sharma",
  "gender": "male",
  "age": 28,
  "relation": "head",
  "phone": "9876543210",
  "adhar_number": "123456789012"
}
````

---

### Request Body Fields

| Field        | Type    | Required | Description                                      |
| ------------ | ------- | -------- | ------------------------------------------------ |
| family_id    | UUID    | Yes      | Family to which member belongs                   |
| name         | string  | Yes      | Member full name                                 |
| gender       | string  | Yes      | `male`, `female`, `other`                        |
| age          | integer | Yes      | Age of the member                                |
| relation     | string  | Yes      | Relation with family (head, spouse, child, etc.) |
| phone        | string  | No       | Contact number                                   |
| adhar_number | string  | No       | Aadhaar number                                   |

---

### Success Response

**201 Created**

```json
{
  "message": "Member added successfully",
  "member": {
    "id": "22beb82b-53d7-4991-8386-5fb2503e6657",
    "family_id": "5ed195e0-4499-4713-a1c7-8d9078e42500",
    "name": "Rohan Sharma",
    "gender": "male",
    "age": 28,
    "relation": "head",
    "adhar_number": "123456789012",
    "phone": "9876543210",
    "is_alive": true,
    "device_created_at": "2025-12-21T20:14:07.011Z"
  }
}
```

---

### Error Responses

**400 Bad Request**
(Invalid or missing fields)

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
(User is not ASHA)

```json
{
  "error": "Only ASHA workers can add family members"
}
```

**404 Not Found**
(Family not found or not assigned to ASHA)

```json
{
  "error": "Invalid family ID"
}
```

**409 Conflict**
(Duplicate Aadhaar or member already exists)

```json
{
  "error": "Member already exists"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Access & Data Constraints

* Only ASHA users can add members
* Family must belong to ASHA’s assigned area
* ASHA must be under ANM supervision
* PHC, ANM, and ASHA IDs are derived internally from JWT
* Client must not send worker or PHC identifiers

```

---






```md
## Create Health Record (ASHA Only)

### Endpoint
POST /health/add

### Description
Creates a new health record for a family member.

This endpoint is **restricted to ASHA workers only**.  
Health records can be created **only for members belonging to families assigned to the ASHA**.

Each health record represents a single visit or interaction (initial or follow-up).

---

### Authentication
Required

Use JWT token received from `/auth/login` **for ASHA user only**.

```

Authorization: Bearer <ASHA_JWT_ACCESS_TOKEN>

````

---

### Headers
| Header | Value |
|------|------|
| Content-Type | application/json |
| Authorization | Bearer `<ASHA_JWT_ACCESS_TOKEN>` |

---

### Request Body
```json
{
  "member_id": "22beb82b-53d7-4991-8386-5fb2503e6657",
  "task_id": null,
  "visit_type": "initial",
  "data_json": {
    "bp": "120/90",
    "weight": 77
  }
}
````

---

### Request Body Fields

| Field      | Type   | Required | Description                              |
| ---------- | ------ | -------- | ---------------------------------------- |
| member_id  | UUID   | Yes      | Family member for whom record is created |
| task_id    | UUID   | No       | Related task ID (if applicable)          |
| visit_type | string | Yes      | `initial` or `follow_up`                 |
| data_json  | object | Yes      | Dynamic health data (BP, weight, etc.)   |

---

### Success Response

**201 Created**

```json
{
  "message": "Health record added",
  "record": {
    "id": "e014b2f9-e18f-4c99-a6db-58b327f22d07",
    "phc_id": "6fa8051e-a511-4788-8c12-bfe2e71ce025",
    "member_id": "22beb82b-53d7-4991-8386-5fb2503e6657",
    "asha_worker_id": "e8f570b6-945d-4a60-82a4-f809c7931786",
    "anm_worker_id": "8b4a031a-9907-4cf8-afaa-8da67a1f9693",
    "area_id": "6cc6782f-64f7-44f9-916e-b9199424d88f",
    "task_id": null,
    "visit_type": "initial",
    "data_json": {
      "bp": "120/90",
      "weight": 77
    }
  }
}
```

---

### Error Responses

**400 Bad Request**
(Invalid request body)

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
(User is not ASHA)

```json
{
  "error": "Only ASHA workers can create health records"
}
```

**404 Not Found**
(Member not found or not assigned to ASHA)

```json
{
  "error": "Invalid member ID"
}
```

**422 Unprocessable Entity**
(Member does not belong to ASHA area or no ANM assigned)

```json
{
  "error": "Member not eligible for health record creation"
}
```

**500 Internal Server Error**

```json
{
  "error": "Internal server error"
}
```

---

### Access & Data Constraints

* Only ASHA users can create health records
* Member must belong to ASHA’s assigned family and area
* ANM supervision must exist
* PHC, ANM, ASHA, and area IDs are derived internally from JWT
* Client must not send worker or PHC identifiers

```

---


