-- =========================================
-- Families Table
-- Household identity + eligibility anchor
-- First table with full offline concurrency support
-- =========================================

CREATE TABLE public.families (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Administrative Ownership
    phc_id UUID NOT NULL,
    area_id UUID NOT NULL,
    asha_id UUID NOT NULL,

    -- Household Metadata
    head_member_id UUID,

    address_line TEXT,
    landmark TEXT,

    -- =========================================
    -- Offline Concurrency Metadata
    -- =========================================

    version INTEGER NOT NULL DEFAULT 1,

    last_modified_by UUID,
    last_modified_role TEXT,
    last_modified_device TEXT,

    -- =========================================
    -- Workflow / Verification Lifecycle
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

    CONSTRAINT families_phc_id_fkey
        FOREIGN KEY (phc_id)
        REFERENCES public.phcs(id),

    CONSTRAINT families_area_id_fkey
        FOREIGN KEY (area_id)
        REFERENCES public.phc_areas(id),

    CONSTRAINT families_asha_id_fkey
        FOREIGN KEY (asha_id)
        REFERENCES public.users(id),

    CONSTRAINT families_workflow_check
        CHECK (workflow_status IN ('draft','submitted','verified','locked'))
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_families_area
ON public.families(area_id);

CREATE INDEX idx_families_asha
ON public.families(asha_id);

CREATE INDEX idx_families_active
ON public.families(is_active);

CREATE INDEX idx_families_version
ON public.families(version);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_families_updated
BEFORE UPDATE ON public.families
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
