# Linux Deployment - Module Not Found Issues Checklist

## 🚨 Critical Issues Found

### 1. **Case-Sensitive Import Mismatch** ⚠️ CRITICAL
**File:** `src/index.js` (line 4)
```javascript
const authController = require("./controllers/authController");
```
**Issue:** Linux is case-sensitive. The actual file is `authcontroller.js` (all lowercase).

**Status on Windows:** Works (Windows ignores case)
**Status on Linux:** ❌ **FAILS** - Module Not Found error

**Action Required:** Rename the file OR update the import to match exactly:
```javascript
// Option 1: Rename file to authController.js (with capital C)
// Option 2: Change import to:
const authController = require("./controllers/authcontroller");
```

---

## ✅ All Other Imports (Verified as Correct)

| File | Import | Status |
|------|--------|--------|
| `src/index.js` | `./controllers/usercontroller` | ✓ Matches |
| `src/routes/families.js` | `../controllers/familiescontroller.js` | ✓ Matches |
| `src/routes/families.js` | `../controllers/memberscontroller.js` | ✓ Matches |
| `src/routes/phcs.js` | `../controllers/phcareascontroller.js` | ✓ Matches |
| `src/routes/health.js` | `../controllers/healthcontroller.js` | ✓ Matches |
| `src/routes/task.js` | `../controllers/taskcontroller.js` | ✓ Matches |
| All files | `../middleware/auth.js` | ✓ Correct |
| All files | `../lib/db.js` | ✓ Correct |
| All files | `../lib/password.js` | ✓ Correct |

---

## 📋 Pre-Deployment Checklist

### Dependencies
- [ ] Run `npm install` on Linux server
- [ ] Verify all packages in `package.json` are installed:
  - bcrypt ^6.0.0
  - cors ^2.8.5
  - dotenv ^17.2.3
  - express ^5.1.0
  - jsonwebtoken ^9.0.2
  - pg ^8.16.3

### Environment Variables
- [ ] Set `DATABASE_URL` (PostgreSQL connection string)
- [ ] Set `JWT_SECRET` (random secure string)
- [ ] Create `.env` file with these variables
- [ ] **DO NOT** commit `.env` to git

### File Case Verification
- [ ] Ensure all controller files are lowercase: `authcontroller.js`, `usercontroller.js`, etc.
- [ ] Update `src/index.js` line 4 if needed:
  ```javascript
  const authController = require("./controllers/authcontroller");
  ```

### Port Configuration
- [ ] Default port is 3000 (see `src/index.js` line 24)
- [ ] Ensure port 3000 is open/available on Linux server
- [ ] Or update `PORT` environment variable if different port needed

### Database Connection
- [ ] PostgreSQL server is running
- [ ] Database URL is correct and accessible
- [ ] Required tables exist (users, families, health_records, etc.)

### Testing
- [ ] Run `node src/index.js` locally to verify no module errors
- [ ] Test login endpoint: `POST /auth/login`
- [ ] Verify all routes respond correctly

---

## 🔧 Example Linux Deployment Steps

```bash
# 1. Clone repo
git clone <repository>
cd Asha-EHR-Backend

# 2. Install dependencies
npm install

# 3. Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/asha_ehr
JWT_SECRET=your_random_secure_secret_here
PORT=3000
EOF

# 4. Start server
node src/index.js

# Or use PM2 for production
pm2 start src/index.js --name "asha-ehr-backend"
pm2 save
pm2 startup
```

---

## 📝 Summary

**Total Issues Found:** 1
- ⚠️ **1 Critical:** Case-sensitive import mismatch in `src/index.js`
- ✓ All other imports verified
- ✓ All dependencies declared
- ⚠️ Environment variables must be configured

**Action Items:**
1. Fix the `authController` import in `src/index.js`
2. Ensure `.env` file is created on Linux server
3. Run `npm install` before starting server
4. Verify database connection
