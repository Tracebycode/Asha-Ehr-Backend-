-- =========================================
-- Health Records Table
-- Clinical visit + observation storage
-- Highest medico-legal sensitivity table
-- =========================================

CREATE TABLE public.health_records (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Administrative Ownership
    phc_id UUID NOT NULL,
    area_id UUID NOT NULL,
    member_id UUID NOT NULL,

    -- Record Author
    asha_id UUID NOT NULL,

    task_id UUID,

    -- Clinical Metadata
    visit_type TEXT NOT NULL,
    data_json JSONB NOT NULL,

    -- =========================================
    -- OCC Concurrency Metadata
    -- =========================================

    version INTEGER NOT NULL DEFAULT 1,

    last_modified_by UUID,
    last_modified_role TEXT,
    last_modified_device TEXT,

    -- =========================================
    -- Clinical Workflow Lifecycle
    -- =========================================

    workflow_status TEXT DEFAULT 'draft',

    -- =========================================
    -- Offline Sync Metadata
    -- =========================================

    device_id TEXT,
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

    CONSTRAINT health_records_phc_id_fkey
        FOREIGN KEY (phc_id)
        REFERENCES public.phcs(id),

    CONSTRAINT health_records_area_id_fkey
        FOREIGN KEY (area_id)
        REFERENCES public.phc_areas(id),

    CONSTRAINT health_records_member_id_fkey
        FOREIGN KEY (member_id)
        REFERENCES public.family_members(id),

    CONSTRAINT health_records_asha_id_fkey
        FOREIGN KEY (asha_id)
        REFERENCES public.users(id),

    CONSTRAINT health_records_task_id_fkey
        FOREIGN KEY (task_id)
        REFERENCES public.tasks(id)
        ON DELETE SET NULL,

    CONSTRAINT health_records_visit_type_check
        CHECK (
            visit_type IN (
                'general',
                'anc',
                'pnc',
                'immunization',
                'nutrition'
            )
        ),

    CONSTRAINT health_records_workflow_check
        CHECK (
            workflow_status IN (
                'draft',
                'submitted',
                'verified',
                'locked',
                'corrected'
            )
        )
);

-- =========================================
-- JSONB Clinical Data Index
-- =========================================

CREATE INDEX idx_health_records_data
ON public.health_records
USING GIN (data_json);

-- =========================================
-- Performance Indexes
-- =========================================

CREATE INDEX idx_health_records_member
ON public.health_records(member_id);

CREATE INDEX idx_health_records_area
ON public.health_records(area_id);

CREATE INDEX idx_health_records_active
ON public.health_records(is_active);

CREATE INDEX idx_health_records_version
ON public.health_records(version);

CREATE INDEX idx_health_records_visit_type
ON public.health_records(visit_type);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_health_records_updated
BEFORE UPDATE ON public.health_records
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
