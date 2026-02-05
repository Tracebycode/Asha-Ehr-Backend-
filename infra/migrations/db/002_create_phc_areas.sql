-- =========================================
-- PHC Areas Table
-- Defines geographic / operational coverage
-- Used for worker assignment and sync partitioning
-- =========================================

CREATE TABLE public.phc_areas (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- PHC Ownership
    phc_id UUID NOT NULL,

    -- Area Metadata
    area_name TEXT NOT NULL,

    -- Optional structured code (useful for govt reporting later)
    area_code TEXT,

    -- Optional geo expansion
    latitude NUMERIC,
    longitude NUMERIC,

    -- Soft Delete
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    created_by UUID,
    updated_by UUID,

    -- Foreign Key
    CONSTRAINT phc_areas_phc_id_fkey
    FOREIGN KEY (phc_id)
    REFERENCES public.phcs(id)
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_phc_areas_phc
ON public.phc_areas(phc_id);

CREATE INDEX idx_phc_areas_active
ON public.phc_areas(is_active);

CREATE INDEX idx_phc_areas_code
ON public.phc_areas(area_code);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_phc_areas_updated
BEFORE UPDATE ON public.phc_areas
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
