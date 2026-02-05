-- =========================================
-- Users Table
-- Healthcare workforce identity and RBAC root
-- =========================================

CREATE TABLE public.users (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Identity
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    gender TEXT,
    dob DATE,
    education_level TEXT,

    -- Role & Authority
    role TEXT NOT NULL,
    authority_level INTEGER NOT NULL,

    -- PHC Ownership
    phc_id UUID NOT NULL,

    -- Authentication
    password_hash TEXT,

    -- Workflow & Lifecycle
    status TEXT NOT NULL DEFAULT 'active',
    is_active BOOLEAN DEFAULT TRUE,

    -- Approval Chain
    created_by UUID,
    approved_by UUID,

    -- Device & Offline Metadata
    last_login_at TIMESTAMPTZ,
    last_login_device TEXT,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- =========================================
    -- Constraints
    -- =========================================

    CONSTRAINT users_phone_key UNIQUE (phone),

    CONSTRAINT users_phc_id_fkey
        FOREIGN KEY (phc_id)
        REFERENCES public.phcs(id),

    CONSTRAINT users_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.users(id),

    CONSTRAINT users_approved_by_fkey
        FOREIGN KEY (approved_by)
        REFERENCES public.users(id),

    CONSTRAINT users_gender_check
        CHECK (gender IN ('male', 'female', 'other')),

    CONSTRAINT users_role_check
        CHECK (role IN ('phc_admin', 'doctor', 'anm', 'asha')),

    CONSTRAINT users_status_check
        CHECK (status IN ('active', 'disabled'))
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_users_phc
ON public.users(phc_id);

CREATE INDEX idx_users_role
ON public.users(role);

CREATE INDEX idx_users_active
ON public.users(is_active);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
