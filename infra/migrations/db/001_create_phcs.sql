-- =========================================
-- PHCs Master Table
-- Primary Health Center registry
-- Master administrative entity
-- =========================================

CREATE TABLE public.phcs (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization Hierarchy
    org_id UUID NOT NULL,

    -- PHC Details
    name TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    license_number TEXT UNIQUE,

    -- Geo Expansion (future routing + analytics)
    latitude NUMERIC,
    longitude NUMERIC,

    -- Soft Delete (never hard delete healthcare infra)
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    created_by UUID,
    updated_by UUID,

    -- =====================================
    -- Foreign Keys
    -- =====================================

    CONSTRAINT fk_phcs_org
        FOREIGN KEY (org_id)
        REFERENCES public.organizations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_phcs_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_phcs_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_phcs_is_active
ON public.phcs(is_active);

CREATE INDEX idx_phcs_pincode
ON public.phcs(pincode);

CREATE INDEX idx_phcs_org_id
ON public.phcs(org_id);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_phcs_updated
BEFORE UPDATE ON public.phcs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
