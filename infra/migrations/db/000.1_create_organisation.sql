-- =========================================
-- Organizations Master Table
-- Hierarchical Administrative Structure
-- =========================================

CREATE TABLE public.organizations (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization Identity
    name TEXT NOT NULL,

    -- Organization Type
    -- STATE / DISTRICT / BLOCK / PHC / NGO / PRIVATE / ADMIN
    type TEXT NOT NULL,

    -- Hierarchy Support
    parent_id UUID,

    -- Optional Admin Metadata
    code TEXT,              -- Govt code / internal reference
    description TEXT,

    -- Geo / Region Support
    pincode TEXT,
    latitude NUMERIC,
    longitude NUMERIC,

    -- Soft Delete
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    created_by UUID,
    updated_by UUID,

    -- =====================================
    -- Foreign Keys
    -- =====================================

    CONSTRAINT fk_org_parent
        FOREIGN KEY (parent_id)
        REFERENCES public.organizations(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_org_created_by
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_org_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);



CREATE INDEX idx_org_parent_id
ON public.organizations(parent_id);

CREATE INDEX idx_org_type
ON public.organizations(type);

CREATE INDEX idx_org_is_active
ON public.organizations(is_active);
