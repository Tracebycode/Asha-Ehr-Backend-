-- =========================================
-- Tasks Table
-- Workforce workflow + visit scheduling
-- Offline-first distributed work orchestration
-- =========================================

CREATE TABLE public.tasks (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Administrative Ownership
    phc_id UUID NOT NULL,
    area_id UUID NOT NULL,

    -- Task Ownership
    created_by UUID,
    assigned_to UUID,

    -- Optional Context Linking
    family_id UUID,
    member_id UUID,

    -- Task Hierarchy
    parent_task_id UUID,

    -- Task Metadata
    task_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,

    due_date DATE,

    -- Workflow Lifecycle
    workflow_status TEXT DEFAULT 'draft',

    -- Flexible Task Payload
    data_json JSONB,

    -- =========================================
    -- OCC Concurrency Metadata
    -- =========================================

    version INTEGER NOT NULL DEFAULT 1,

    last_modified_by UUID,
    last_modified_role TEXT,
    last_modified_device TEXT,

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

    CONSTRAINT tasks_phc_id_fkey
        FOREIGN KEY (phc_id)
        REFERENCES public.phcs(id),

    CONSTRAINT tasks_area_id_fkey
        FOREIGN KEY (area_id)
        REFERENCES public.phc_areas(id),

    CONSTRAINT tasks_created_by_fkey
        FOREIGN KEY (created_by)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_assigned_to_fkey
        FOREIGN KEY (assigned_to)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_family_id_fkey
        FOREIGN KEY (family_id)
        REFERENCES public.families(id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_member_id_fkey
        FOREIGN KEY (member_id)
        REFERENCES public.family_members(id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_parent_task_id_fkey
        FOREIGN KEY (parent_task_id)
        REFERENCES public.tasks(id)
        ON DELETE SET NULL,

    CONSTRAINT tasks_workflow_check
        CHECK (
            workflow_status IN (
                'draft',
                'assigned',
                'in_progress',
                'completed',
                'verified',
                'cancelled'
            )
        ),

    CONSTRAINT tasks_type_check
        CHECK (
            task_type IN (
                'ANC',
                'PNC',
                'TB_SCREEN',
                'IMMUNIZATION',
                'GENERAL',
                'SURVEY',
                'CUSTOM'
            )
        )
);

-- =========================================
-- JSONB Index
-- =========================================

CREATE INDEX idx_tasks_data
ON public.tasks
USING GIN (data_json);

-- =========================================
-- Performance Indexes
-- =========================================

CREATE INDEX idx_tasks_area
ON public.tasks(area_id);

CREATE INDEX idx_tasks_assigned
ON public.tasks(assigned_to);

CREATE INDEX idx_tasks_family
ON public.tasks(family_id);

CREATE INDEX idx_tasks_member
ON public.tasks(member_id);

CREATE INDEX idx_tasks_active
ON public.tasks(is_active);

CREATE INDEX idx_tasks_version
ON public.tasks(version);

-- =========================================
-- Trigger for Auto updated_at
-- =========================================

CREATE TRIGGER trg_tasks_updated
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();
