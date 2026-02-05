-- =========================================
-- User Area Assignment Table
-- Maps healthcare workers to operational areas
-- Core table for sync partitioning & RLS boundary
-- =========================================

CREATE TABLE public.user_area_map (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationship Mapping
    user_id UUID NOT NULL,
    area_id UUID NOT NULL,

    -- Assignment Lifecycle
    assigned_at TIMESTAMPTZ DEFAULT now(),
    unassigned_at TIMESTAMPTZ,

    -- Assignment Status (soft lifecycle control)
    is_active BOOLEAN DEFAULT TRUE,

    -- Assignment Metadata
    assigned_by UUID,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- =========================================
    -- Constraints
    -- =========================================

    CONSTRAINT user_area_map_user_area_unique
        UNIQUE (user_id, area_id),

    CONSTRAINT user_area_map_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id),

    CONSTRAINT user_area_map_area_id_fkey
        FOREIGN KEY (area_id)
        REFERENCES public.phc_areas(id),

    CONSTRAINT user_area_map_assigned_by_fkey
        FOREIGN KEY (assigned_by)
        REFERENCES public.users(id)
);

-- =========================================
-- Indexes
-- =========================================

CREATE INDEX idx_user_area_map_user
ON public.user_area_map(user_id);

CREATE INDEX idx_user_area_map_area
ON public.user_area_map(area_id);

CREATE INDEX idx_user_area_map_active
ON public.user_area_map(is_active);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_user_area_map_updated
BEFORE UPDATE ON public.user_area_map
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
