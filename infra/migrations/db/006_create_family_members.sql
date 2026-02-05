-- =========================================
-- Family Members Table
-- Patient identity registry
-- High conflict + high medico-legal sensitivity
-- =========================================

CREATE TABLE public.family_members (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Household Ownership
    family_id UUID NOT NULL,

    -- Patient Identity
    name TEXT NOT NULL,
    gender TEXT,
    relation TEXT,
    dob DATE,

    adhar_number TEXT,
    phone TEXT,

    -- Vital Status
    is_alive BOOLEAN NOT NULL DEFAULT TRUE,

    next_visit_date DATE,

    -- =========================================
    -- Offline Concurrency Metadata
    -- =========================================

    version INTEGER NOT NULL DEFAULT 1,

    last_modified_by UUID,
    last_modified_role TEXT,
    last_modified_device TEXT,

    -- =========================================
    -- Workflow Lifecycle
    -- =========================================

    workflow_status TEXT DEFAULT 'draft',

    -- =========================================
    -- Offline Sync Metadata
    -- =========================================

    device_created_at TIMESTAMPTZ DEFAULT now(),
    device_updated_at TIMESTAMPTZ DEFAULT now(),
    synced_at TIMESTAMPTZ,

    -- =========================================
    -- Soft Delete
    -- =========================================

    is_active BOOLEAN DEFAULT TRUE,

    -- =========================================
    -- Audit Metadata
    -- =========================================

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- =========================================
    -- Constraints
    -- =========================================

    CONSTRAINT family_members_family_id_fkey
        FOREIGN KEY (family_id)
        REFERENCES public.families(id),

    CONSTRAINT family_members_gender_check
        CHECK (gender IS NULL OR gender IN ('male','female','other')),

    CONSTRAINT family_members_relation_check
        CHECK (
            relation IS NULL OR relation IN (
                'head','spouse','son','daughter',
                'father','mother','grandparent','other'
            )
        ),

    CONSTRAINT family_members_workflow_check
        CHECK (workflow_status IN ('draft','submitted','verified','locked'))
);

-- =========================================
-- Unique Aadhaar Constraint (Nullable Safe)
-- =========================================

CREATE UNIQUE INDEX idx_family_members_adhar_unique
ON public.family_members(adhar_number)
WHERE adhar_number IS NOT NULL;

-- =========================================
-- Identity Search Indexes
-- =========================================

CREATE INDEX idx_family_members_family
ON public.family_members(family_id);

CREATE INDEX idx_family_members_name
ON public.family_members(name);

CREATE INDEX idx_family_members_dob
ON public.family_members(dob);

CREATE INDEX idx_family_members_active
ON public.family_members(is_active);

CREATE INDEX idx_family_members_version
ON public.family_members(version);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_family_members_updated
BEFORE UPDATE ON public.family_members
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
