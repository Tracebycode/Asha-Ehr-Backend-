-- =========================================
-- Sync Logs Table
-- Offline sync observability + conflict telemetry
-- Core distributed system debugging infrastructure
-- =========================================

CREATE TABLE public.sync_logs (

    -- Primary Identifier
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync Actor
    user_id UUID,
    device_id TEXT,

    -- Operation Grouping
    sync_batch_id UUID,

    -- Entity Context
    entity_type TEXT NOT NULL,
    entity_id UUID,

    -- Operation Metadata
    action TEXT NOT NULL,
    status TEXT NOT NULL,

    -- Version Tracking (OCC Debugging)
    client_version INTEGER,
    server_version INTEGER,

    -- Conflict Telemetry
    conflict_detected BOOLEAN DEFAULT FALSE,
    conflict_resolved BOOLEAN DEFAULT FALSE,

    -- Authority Context
    user_role TEXT,

    -- Retry Metadata
    retry_count INTEGER DEFAULT 0,

    -- Payload / Error Tracking
    payload JSONB,
    error_message TEXT,

    -- Audit Metadata
    created_at TIMESTAMPTZ DEFAULT now(),

    -- =========================================
    -- Constraints
    -- =========================================

    CONSTRAINT sync_logs_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT sync_logs_action_check
        CHECK (
            action IN (
                'CREATE',
                'UPDATE',
                'DELETE',
                'SYNC'
            )
        ),

    CONSTRAINT sync_logs_status_check
        CHECK (
            status IN (
                'SUCCESS',
                'FAILED',
                'RETRIED'
            )
        )
);

-- =========================================
-- Performance Indexes
-- =========================================

CREATE INDEX idx_sync_logs_user
ON public.sync_logs(user_id);

CREATE INDEX idx_sync_logs_entity
ON public.sync_logs(entity_type, entity_id);

CREATE INDEX idx_sync_logs_device
ON public.sync_logs(device_id);

CREATE INDEX idx_sync_logs_batch
ON public.sync_logs(sync_batch_id);

CREATE INDEX idx_sync_logs_conflict
ON public.sync_logs(conflict_detected);

CREATE INDEX idx_sync_logs_created
ON public.sync_logs(created_at);
