-- =========================================
-- Conflict Logs Table
-- Field-level conflict resolution audit
-- Medico-legal merge decision tracking
-- =========================================

CREATE TABLE public.conflict_logs (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Entity Context
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,

    -- Field-Level Context
    field_path TEXT NOT NULL,

    -- Value Tracking
    client_value JSONB,
    server_value JSONB,
    resolved_value JSONB,

    -- Authority Context
    client_user_id UUID,
    server_user_id UUID,

    client_role TEXT,
    server_role TEXT,

    -- Resolution Metadata
    resolution_type TEXT NOT NULL,

    -- Device Context
    device_id TEXT,

    -- Version Tracking
    client_version INTEGER,
    server_version INTEGER,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),

    -- =========================================
    -- Constraints
    -- =========================================

    CONSTRAINT conflict_logs_client_user_fkey
        FOREIGN KEY (client_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT conflict_logs_server_user_fkey
        FOREIGN KEY (server_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT conflict_logs_resolution_check
        CHECK (
            resolution_type IN (
                'CLIENT_ACCEPTED',
                'SERVER_ACCEPTED',
                'MERGED',
                'REJECTED_UNAUTHORIZED'
            )
        )
);

-- =========================================
-- Performance Indexes
-- =========================================

CREATE INDEX idx_conflict_logs_entity
ON public.conflict_logs(entity_type, entity_id);

CREATE INDEX idx_conflict_logs_field
ON public.conflict_logs(field_path);

CREATE INDEX idx_conflict_logs_device
ON public.conflict_logs(device_id);

CREATE INDEX idx_conflict_logs_created
ON public.conflict_logs(created_at);
