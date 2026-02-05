-- =========================================
-- PHCs Master Table
-- Primary Health Center registry
-- Master administrative entity
-- =========================================

CREATE TABLE public.phcs (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- PHC Details
    name TEXT NOT NULL,
    address TEXT,
    pincode TEXT,
    license_number TEXT,

    -- Geo Expansion (future routing + analytics)
    latitude NUMERIC,
    longitude NUMERIC,

    -- Soft Delete (never hard delete healthcare infra)
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    created_by UUID,
    updated_by UUID
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_phcs_is_active
ON public.phcs(is_active);

CREATE INDEX idx_phcs_pincode
ON public.phcs(pincode);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_phcs_updated
BEFORE UPDATE ON public.phcs
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
