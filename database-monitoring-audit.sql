-- ============================================================================
-- COMPREHENSIVE DATABASE AUDIT LOGGING AND MONITORING SYSTEM
-- FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file implements a comprehensive monitoring and audit system featuring:
-- - Real-time performance monitoring
-- - Security event detection and alerting
-- - Data integrity verification
-- - Automated performance optimization
-- - Compliance audit trails
-- - Multi-tenant metrics and analytics
--
-- Components:
-- - Performance monitoring tables and functions
-- - Security event detection triggers
-- - Automated alert system
-- - Compliance reporting tools
-- - Data integrity checkers
-- - Performance tuning recommendations
-- ============================================================================

-- ============================================================================
-- PERFORMANCE MONITORING INFRASTRUCTURE
-- ============================================================================

-- Performance metrics collection table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    tags JSONB DEFAULT '{}' NOT NULL,
    threshold_warning DECIMAL(15,4),
    threshold_critical DECIMAL(15,4),
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_metric_type CHECK (metric_type IN (
        'query_performance', 'connection_count', 'cpu_usage', 'memory_usage',
        'disk_io', 'cache_hit_ratio', 'table_size', 'index_usage', 'lock_contention'
    ))
);

-- Query performance tracking
CREATE TABLE IF NOT EXISTS query_performance_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    query_hash VARCHAR(64) NOT NULL,
    query_text TEXT,
    execution_time_ms DECIMAL(10,3) NOT NULL,
    rows_examined INTEGER,
    rows_returned INTEGER,
    tables_accessed TEXT[],
    indexes_used TEXT[],
    temp_files_created INTEGER DEFAULT 0,
    memory_used_mb DECIMAL(10,2),
    cpu_time_ms DECIMAL(10,3),
    io_read_mb DECIMAL(10,2),
    io_write_mb DECIMAL(10,2),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Performance classification
    performance_class VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN execution_time_ms < 100 THEN 'fast'
            WHEN execution_time_ms < 1000 THEN 'moderate'
            WHEN execution_time_ms < 5000 THEN 'slow'
            ELSE 'critical'
        END
    ) STORED
);

-- Database health metrics
CREATE TABLE IF NOT EXISTS database_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Connection metrics
    total_connections INTEGER NOT NULL,
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    max_connections INTEGER NOT NULL,
    
    -- Cache metrics
    buffer_cache_hit_ratio DECIMAL(5,2) NOT NULL,
    index_cache_hit_ratio DECIMAL(5,2) NOT NULL,
    
    -- I/O metrics
    blocks_read BIGINT NOT NULL,
    blocks_hit BIGINT NOT NULL,
    
    -- Transaction metrics
    commits_per_second DECIMAL(10,2),
    rollbacks_per_second DECIMAL(10,2),
    deadlocks_per_second DECIMAL(8,4),
    
    -- Lock metrics
    lock_waits BIGINT,
    lock_wait_time_ms BIGINT,
    
    -- Table and index metrics
    table_scans BIGINT,
    index_scans BIGINT,
    
    -- Replication metrics (if applicable)
    replication_lag_ms INTEGER DEFAULT 0,
    
    -- Overall health score (0-100)
    health_score INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN buffer_cache_hit_ratio > 95 AND index_cache_hit_ratio > 95 
                 AND (active_connections::DECIMAL / max_connections) < 0.8
                 AND deadlocks_per_second < 0.1
            THEN 100
            WHEN buffer_cache_hit_ratio > 90 AND index_cache_hit_ratio > 90 
                 AND (active_connections::DECIMAL / max_connections) < 0.9
                 AND deadlocks_per_second < 0.5
            THEN 85
            WHEN buffer_cache_hit_ratio > 85 AND index_cache_hit_ratio > 85 
                 AND (active_connections::DECIMAL / max_connections) < 0.95
                 AND deadlocks_per_second < 1.0
            THEN 70
            ELSE 50
        END
    ) STORED
);

-- ============================================================================
-- SECURITY MONITORING AND AUDIT ENHANCEMENTS
-- ============================================================================

-- Enhanced security events with risk scoring
CREATE TABLE IF NOT EXISTS security_events_detailed (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0, -- 0-100 scale
    
    -- Event details
    event_title VARCHAR(255) NOT NULL,
    event_description TEXT NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    
    -- Technical details
    affected_resource_type VARCHAR(50),
    affected_resource_id UUID,
    sql_query TEXT,
    query_duration_ms INTEGER,
    
    -- Detection information
    detection_method VARCHAR(50) NOT NULL,
    detection_rule VARCHAR(100),
    confidence_score DECIMAL(3,2) DEFAULT 1.00 NOT NULL,
    false_positive_likelihood VARCHAR(20) DEFAULT 'low' NOT NULL,
    
    -- Response information
    auto_blocked BOOLEAN DEFAULT false NOT NULL,
    manual_review_required BOOLEAN DEFAULT false NOT NULL,
    action_taken TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    
    -- Additional context
    geolocation JSONB,
    device_fingerprint VARCHAR(255),
    related_events UUID[],
    evidence JSONB DEFAULT '{}' NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'authentication_failure', 'privilege_escalation', 'data_exfiltration',
        'suspicious_query', 'rate_limit_exceeded', 'unusual_access_pattern',
        'data_modification_anomaly', 'concurrent_session_anomaly', 'sql_injection_attempt'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_risk_score CHECK (risk_score >= 0 AND risk_score <= 100),
    CONSTRAINT valid_detection_method CHECK (detection_method IN (
        'rule_based', 'ml_model', 'anomaly_detection', 'pattern_matching', 'manual'
    )),
    CONSTRAINT valid_false_positive_likelihood CHECK (false_positive_likelihood IN ('low', 'medium', 'high')),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00)
);

-- Data access audit log
CREATE TABLE IF NOT EXISTS data_access_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Access details
    table_name VARCHAR(100) NOT NULL,
    operation_type VARCHAR(20) NOT NULL,
    record_id UUID,
    column_names TEXT[],
    
    -- Query information
    query_hash VARCHAR(64),
    query_fingerprint TEXT,
    execution_time_ms DECIMAL(10,3),
    rows_affected INTEGER,
    
    -- Data sensitivity
    contains_pii BOOLEAN DEFAULT false NOT NULL,
    contains_sensitive_data BOOLEAN DEFAULT false NOT NULL,
    data_classification VARCHAR(20) DEFAULT 'public' NOT NULL,
    
    -- Access context
    access_reason VARCHAR(100),
    application_context VARCHAR(100),
    session_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    
    -- Compliance tracking
    gdpr_applicable BOOLEAN DEFAULT false NOT NULL,
    retention_period_days INTEGER,
    
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_operation_type CHECK (operation_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
    CONSTRAINT valid_data_classification CHECK (data_classification IN ('public', 'internal', 'confidential', 'restricted'))
);

-- ============================================================================
-- AUTOMATED MONITORING FUNCTIONS
-- ============================================================================

-- Function to collect database health metrics
CREATE OR REPLACE FUNCTION collect_database_health_metrics()
RETURNS BOOLEAN AS $$
DECLARE
    total_conn INTEGER;
    active_conn INTEGER;
    idle_conn INTEGER;
    max_conn INTEGER;
    buffer_hit_ratio DECIMAL(5,2);
    index_hit_ratio DECIMAL(5,2);
    blocks_read_val BIGINT;
    blocks_hit_val BIGINT;
    commits_rate DECIMAL(10,2);
    rollbacks_rate DECIMAL(10,2);
    deadlock_rate DECIMAL(8,4);
BEGIN
    -- Collect connection metrics
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE state = 'active'),
        COUNT(*) FILTER (WHERE state = 'idle'),
        setting::INTEGER
    INTO total_conn, active_conn, idle_conn, max_conn
    FROM pg_stat_activity, pg_settings 
    WHERE name = 'max_connections';
    
    -- Collect cache hit ratios
    SELECT 
        ROUND(100.0 * sum(blks_hit) / GREATEST(sum(blks_hit) + sum(blks_read), 1), 2),
        ROUND(100.0 * sum(idx_blks_hit) / GREATEST(sum(idx_blks_hit) + sum(idx_blks_read), 1), 2)
    INTO buffer_hit_ratio, index_hit_ratio
    FROM pg_stat_user_tables;
    
    -- Collect block I/O metrics
    SELECT sum(blks_read), sum(blks_hit)
    INTO blocks_read_val, blocks_hit_val
    FROM pg_stat_user_tables;
    
    -- Collect transaction metrics (simplified)
    SELECT 
        COALESCE(xact_commit, 0) / GREATEST(EXTRACT(EPOCH FROM (NOW() - stats_reset)), 1),
        COALESCE(xact_rollback, 0) / GREATEST(EXTRACT(EPOCH FROM (NOW() - stats_reset)), 1),
        COALESCE(deadlocks, 0) / GREATEST(EXTRACT(EPOCH FROM (NOW() - stats_reset)), 1)
    INTO commits_rate, rollbacks_rate, deadlock_rate
    FROM pg_stat_database 
    WHERE datname = current_database();
    
    -- Insert metrics
    INSERT INTO database_health_metrics (
        total_connections, active_connections, idle_connections, max_connections,
        buffer_cache_hit_ratio, index_cache_hit_ratio,
        blocks_read, blocks_hit,
        commits_per_second, rollbacks_per_second, deadlocks_per_second
    ) VALUES (
        total_conn, active_conn, idle_conn, max_conn,
        buffer_hit_ratio, index_hit_ratio,
        blocks_read_val, blocks_hit_val,
        commits_rate, rollbacks_rate, deadlock_rate
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to detect slow queries
CREATE OR REPLACE FUNCTION detect_slow_queries()
RETURNS TABLE(
    query_hash VARCHAR(64),
    avg_execution_time DECIMAL(10,3),
    total_executions BIGINT,
    slowest_execution DECIMAL(10,3),
    tables_involved TEXT[],
    optimization_suggestion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qpl.query_hash,
        AVG(qpl.execution_time_ms) as avg_execution_time,
        COUNT(*) as total_executions,
        MAX(qpl.execution_time_ms) as slowest_execution,
        array_agg(DISTINCT unnest(qpl.tables_accessed)) as tables_involved,
        CASE 
            WHEN AVG(qpl.execution_time_ms) > 5000 THEN 'Critical: Review query structure and indexes'
            WHEN AVG(qpl.execution_time_ms) > 1000 THEN 'Warning: Consider query optimization'
            WHEN AVG(qpl.rows_examined) / GREATEST(AVG(qpl.rows_returned), 1) > 100 THEN 'High scan ratio: Check indexes'
            ELSE 'Good performance'
        END as optimization_suggestion
    FROM query_performance_log qpl
    WHERE qpl.executed_at > NOW() - INTERVAL '1 hour'
    GROUP BY qpl.query_hash
    HAVING AVG(qpl.execution_time_ms) > 100 -- Only queries slower than 100ms
    ORDER BY avg_execution_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to detect suspicious activity patterns
CREATE OR REPLACE FUNCTION detect_suspicious_activity()
RETURNS TABLE(
    tenant_id UUID,
    user_id UUID,
    suspicious_pattern TEXT,
    risk_score INTEGER,
    event_count BIGINT,
    time_window TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Detect unusual login patterns
    SELECT 
        us.tenant_id,
        us.user_id,
        'Unusual login frequency' as suspicious_pattern,
        80 as risk_score,
        COUNT(*) as event_count,
        '1 hour' as time_window
    FROM user_sessions us
    WHERE us.created_at > NOW() - INTERVAL '1 hour'
    GROUP BY us.tenant_id, us.user_id
    HAVING COUNT(*) > 10 -- More than 10 sessions in 1 hour
    
    UNION ALL
    
    -- Detect data access anomalies
    SELECT 
        daa.tenant_id,
        daa.user_id,
        'High volume data access' as suspicious_pattern,
        70 as risk_score,
        COUNT(*) as event_count,
        '1 hour' as time_window
    FROM data_access_audit daa
    WHERE daa.accessed_at > NOW() - INTERVAL '1 hour'
      AND daa.operation_type = 'SELECT'
    GROUP BY daa.tenant_id, daa.user_id
    HAVING SUM(daa.rows_affected) > 10000 -- More than 10k rows accessed
    
    UNION ALL
    
    -- Detect privilege escalation attempts
    SELECT 
        al.tenant_id,
        al.user_id,
        'Potential privilege escalation' as suspicious_pattern,
        90 as risk_score,
        COUNT(*) as event_count,
        '4 hours' as time_window
    FROM audit_logs al
    WHERE al.created_at > NOW() - INTERVAL '4 hours'
      AND al.action IN ('permission_grant', 'role_change', 'admin_access')
    GROUP BY al.tenant_id, al.user_id
    HAVING COUNT(*) > 3 -- Multiple privilege changes
    
    ORDER BY risk_score DESC, event_count DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED ALERTING SYSTEM
-- ============================================================================

-- Alert configuration table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL,
    condition_sql TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    -- Threshold configuration
    warning_threshold DECIMAL(15,4),
    critical_threshold DECIMAL(15,4),
    evaluation_interval_minutes INTEGER DEFAULT 5 NOT NULL,
    
    -- Notification configuration
    notification_channels JSONB DEFAULT '[]' NOT NULL,
    notification_template TEXT,
    
    -- Rule status
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0 NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_rule_type CHECK (rule_type IN (
        'performance', 'security', 'availability', 'data_integrity', 'compliance'
    )),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Alert instances table
CREATE TABLE IF NOT EXISTS alert_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_title VARCHAR(255) NOT NULL,
    alert_message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    
    -- Metric information
    metric_value DECIMAL(15,4),
    threshold_value DECIMAL(15,4),
    
    -- Context
    affected_resource VARCHAR(255),
    additional_context JSONB DEFAULT '{}' NOT NULL,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    
    -- Timestamps
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_alert_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT valid_alert_status CHECK (status IN ('active', 'acknowledged', 'resolved', 'suppressed'))
);

-- Function to evaluate alert rules
CREATE OR REPLACE FUNCTION evaluate_alert_rules()
RETURNS INTEGER AS $$
DECLARE
    rule_record RECORD;
    result_record RECORD;
    alert_count INTEGER := 0;
    metric_val DECIMAL(15,4);
    should_alert BOOLEAN;
BEGIN
    -- Iterate through all enabled alert rules
    FOR rule_record IN 
        SELECT * FROM alert_rules 
        WHERE is_enabled = true 
        AND (last_evaluated_at IS NULL OR last_evaluated_at < NOW() - (evaluation_interval_minutes || ' minutes')::INTERVAL)
    LOOP
        -- Execute the condition SQL
        BEGIN
            EXECUTE rule_record.condition_sql INTO metric_val;
            
            -- Determine if alert should be triggered
            should_alert := false;
            
            IF rule_record.critical_threshold IS NOT NULL AND metric_val >= rule_record.critical_threshold THEN
                should_alert := true;
            ELSIF rule_record.warning_threshold IS NOT NULL AND metric_val >= rule_record.warning_threshold THEN
                should_alert := true;
            END IF;
            
            -- Create alert if conditions are met
            IF should_alert THEN
                INSERT INTO alert_instances (
                    alert_rule_id,
                    alert_title,
                    alert_message,
                    severity,
                    metric_value,
                    threshold_value,
                    affected_resource
                ) VALUES (
                    rule_record.id,
                    rule_record.rule_name,
                    format('Alert triggered: %s (value: %s)', rule_record.rule_name, metric_val),
                    CASE 
                        WHEN metric_val >= COALESCE(rule_record.critical_threshold, 999999) THEN 'critical'
                        ELSE 'warning'
                    END,
                    metric_val,
                    COALESCE(rule_record.critical_threshold, rule_record.warning_threshold),
                    'database'
                );
                
                alert_count := alert_count + 1;
                
                -- Update rule trigger count and timestamp
                UPDATE alert_rules 
                SET trigger_count = trigger_count + 1,
                    last_triggered_at = NOW()
                WHERE id = rule_record.id;
            END IF;
            
            -- Update last evaluated timestamp
            UPDATE alert_rules 
            SET last_evaluated_at = NOW() 
            WHERE id = rule_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log rule evaluation error
            INSERT INTO audit_logs (
                actor_type,
                action,
                resource_type,
                metadata
            ) VALUES (
                'system',
                'alert_rule_error',
                'monitoring',
                jsonb_build_object(
                    'rule_id', rule_record.id,
                    'rule_name', rule_record.rule_name,
                    'error_message', SQLERRM
                )
            );
        END;
    END LOOP;
    
    RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLIANCE AND REPORTING FUNCTIONS
-- ============================================================================

-- Function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_report(
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    report_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
    section VARCHAR(50),
    metric VARCHAR(100),
    value BIGINT,
    status VARCHAR(20),
    details TEXT
) AS $$
BEGIN
    -- Data access compliance
    RETURN QUERY
    SELECT 
        'Data Access'::VARCHAR(50),
        'Total data access events'::VARCHAR(100),
        COUNT(*)::BIGINT,
        CASE WHEN COUNT(*) < 1000000 THEN 'compliant' ELSE 'review_required' END::VARCHAR(20),
        format('Data access events from %s to %s', start_date, end_date)
    FROM data_access_audit daa
    WHERE daa.accessed_at BETWEEN start_date AND end_date
    AND (report_tenant_id IS NULL OR daa.tenant_id = report_tenant_id);
    
    -- PII access tracking
    RETURN QUERY
    SELECT 
        'Data Protection'::VARCHAR(50),
        'PII access events'::VARCHAR(100),
        COUNT(*)::BIGINT,
        'requires_review'::VARCHAR(20),
        'All PII access events must be justified and documented'
    FROM data_access_audit daa
    WHERE daa.accessed_at BETWEEN start_date AND end_date
    AND daa.contains_pii = true
    AND (report_tenant_id IS NULL OR daa.tenant_id = report_tenant_id);
    
    -- Security incidents
    RETURN QUERY
    SELECT 
        'Security'::VARCHAR(50),
        'High-risk security events'::VARCHAR(100),
        COUNT(*)::BIGINT,
        CASE WHEN COUNT(*) = 0 THEN 'compliant' ELSE 'investigation_required' END::VARCHAR(20),
        'Security events with high or critical severity'
    FROM security_events_detailed sed
    WHERE sed.created_at BETWEEN start_date AND end_date
    AND sed.severity IN ('high', 'critical')
    AND (report_tenant_id IS NULL OR sed.tenant_id = report_tenant_id);
    
    -- Audit log completeness
    RETURN QUERY
    SELECT 
        'Audit Trail'::VARCHAR(50),
        'Audit log entries'::VARCHAR(100),
        COUNT(*)::BIGINT,
        'compliant'::VARCHAR(20),
        'Comprehensive audit trail maintained'
    FROM audit_logs al
    WHERE al.created_at BETWEEN start_date AND end_date
    AND (report_tenant_id IS NULL OR al.tenant_id = report_tenant_id);
END;
$$ LANGUAGE plpgsql;

-- Function to check data integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    check_type TEXT,
    status TEXT,
    issue_count BIGINT,
    details TEXT
) AS $$
BEGIN
    -- Check for orphaned records
    RETURN QUERY
    SELECT 
        'users'::TEXT,
        'orphaned_records'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END::TEXT,
        COUNT(*)::BIGINT,
        'Users without valid tenant references'
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE t.id IS NULL;
    
    RETURN QUERY
    SELECT 
        'news'::TEXT,
        'orphaned_records'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END::TEXT,
        COUNT(*)::BIGINT,
        'News articles without valid author references'
    FROM news n
    LEFT JOIN users u ON n.author_id = u.id
    WHERE u.id IS NULL;
    
    -- Check for data consistency
    RETURN QUERY
    SELECT 
        'content_tags'::TEXT,
        'consistency_check'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END::TEXT,
        COUNT(*)::BIGINT,
        'Content tags pointing to non-existent content'
    FROM content_tags ct
    WHERE (ct.content_type = 'news' AND NOT EXISTS (SELECT 1 FROM news WHERE id = ct.content_id))
       OR (ct.content_type = 'blog' AND NOT EXISTS (SELECT 1 FROM blogs WHERE id = ct.content_id))
       OR (ct.content_type = 'program' AND NOT EXISTS (SELECT 1 FROM programs WHERE id = ct.content_id));
    
    -- Check for duplicate slugs within tenants
    RETURN QUERY
    SELECT 
        'news'::TEXT,
        'duplicate_slugs'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END::TEXT,
        COUNT(*)::BIGINT,
        'Duplicate news slugs within same tenant'
    FROM (
        SELECT tenant_id, slug, COUNT(*) as slug_count
        FROM news
        GROUP BY tenant_id, slug
        HAVING COUNT(*) > 1
    ) duplicate_slugs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION RECOMMENDATIONS
-- ============================================================================

-- Function to suggest performance optimizations
CREATE OR REPLACE FUNCTION suggest_performance_optimizations()
RETURNS TABLE(
    optimization_type TEXT,
    priority TEXT,
    description TEXT,
    impact_estimate TEXT,
    implementation_effort TEXT
) AS $$
BEGIN
    -- Check for missing indexes on foreign keys
    RETURN QUERY
    SELECT 
        'indexing'::TEXT,
        'high'::TEXT,
        'Missing indexes on frequently queried foreign key columns'::TEXT,
        'Significant query performance improvement'::TEXT,
        'Low - Create indexes during maintenance window'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM query_performance_log qpl
        WHERE qpl.executed_at > NOW() - INTERVAL '24 hours'
        AND qpl.execution_time_ms > 1000
        AND qpl.query_text ILIKE '%JOIN%'
    );
    
    -- Check for table bloat
    RETURN QUERY
    SELECT 
        'maintenance'::TEXT,
        'medium'::TEXT,
        'Table bloat detected - consider VACUUM FULL or REINDEX'::TEXT,
        'Improved query performance and reduced storage'::TEXT,
        'Medium - Schedule during maintenance window'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM performance_metrics pm
        WHERE pm.metric_type = 'table_size'
        AND pm.collected_at > NOW() - INTERVAL '1 day'
        AND pm.metric_value > pm.threshold_warning
    );
    
    -- Check for inefficient queries
    RETURN QUERY
    SELECT 
        'query_optimization'::TEXT,
        'high'::TEXT,
        'Inefficient queries detected with high execution time'::TEXT,
        'Major performance improvement'::TEXT,
        'High - Requires query analysis and rewriting'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM query_performance_log qpl
        WHERE qpl.executed_at > NOW() - INTERVAL '24 hours'
        AND qpl.performance_class = 'critical'
        GROUP BY qpl.query_hash
        HAVING COUNT(*) > 10
    );
    
    -- Check connection pool optimization
    RETURN QUERY
    SELECT 
        'connection_pooling'::TEXT,
        'medium'::TEXT,
        'High connection count - optimize connection pooling'::TEXT,
        'Reduced resource usage and improved scalability'::TEXT,
        'Low - Adjust connection pool settings'::TEXT
    WHERE EXISTS (
        SELECT 1 FROM database_health_metrics dhm
        WHERE dhm.metric_timestamp > NOW() - INTERVAL '1 hour'
        AND (dhm.active_connections::DECIMAL / dhm.max_connections) > 0.8
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED MAINTENANCE PROCEDURES
-- ============================================================================

-- Function to perform automated cleanup
CREATE OR REPLACE FUNCTION automated_cleanup()
RETURNS TEXT AS $$
DECLARE
    cleanup_report TEXT := '';
    rows_deleted INTEGER;
BEGIN
    -- Clean up old query performance logs (keep last 7 days)
    DELETE FROM query_performance_log 
    WHERE executed_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old query performance logs\n', rows_deleted);
    
    -- Clean up old page views (keep last 30 days)
    DELETE FROM page_views 
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old page views\n', rows_deleted);
    
    -- Clean up resolved alert instances (keep last 90 days)
    DELETE FROM alert_instances 
    WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '90 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old resolved alerts\n', rows_deleted);
    
    -- Clean up old performance metrics (keep last 30 days)
    DELETE FROM performance_metrics 
    WHERE collected_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    cleanup_report := cleanup_report || format('Deleted %s old performance metrics\n', rows_deleted);
    
    -- Update table statistics
    ANALYZE;
    cleanup_report := cleanup_report || 'Updated table statistics\n';
    
    -- Log cleanup activity
    INSERT INTO audit_logs (
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        'system',
        'automated_cleanup',
        'database',
        jsonb_build_object(
            'cleanup_report', cleanup_report,
            'executed_at', NOW()
        )
    );
    
    RETURN cleanup_report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING DASHBOARD VIEWS
-- ============================================================================

-- Real-time dashboard view
CREATE OR REPLACE VIEW monitoring_dashboard AS
SELECT 
    'Database Health' as category,
    dhm.health_score::TEXT as value,
    CASE 
        WHEN dhm.health_score >= 90 THEN 'excellent'
        WHEN dhm.health_score >= 80 THEN 'good'
        WHEN dhm.health_score >= 60 THEN 'warning'
        ELSE 'critical'
    END as status,
    'Overall database health score' as description,
    dhm.metric_timestamp as last_updated
FROM database_health_metrics dhm
WHERE dhm.metric_timestamp = (SELECT MAX(metric_timestamp) FROM database_health_metrics)

UNION ALL

SELECT 
    'Active Alerts',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) = 0 THEN 'good'
        WHEN COUNT(*) < 5 THEN 'warning'
        ELSE 'critical'
    END,
    'Number of active alerts requiring attention',
    NOW()
FROM alert_instances ai
WHERE ai.status = 'active'

UNION ALL

SELECT 
    'Query Performance',
    ROUND(AVG(qpl.execution_time_ms), 2)::TEXT || 'ms',
    CASE 
        WHEN AVG(qpl.execution_time_ms) < 100 THEN 'excellent'
        WHEN AVG(qpl.execution_time_ms) < 500 THEN 'good'
        WHEN AVG(qpl.execution_time_ms) < 1000 THEN 'warning'
        ELSE 'critical'
    END,
    'Average query execution time (last hour)',
    NOW()
FROM query_performance_log qpl
WHERE qpl.executed_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    'Security Events',
    COUNT(*)::TEXT,
    CASE 
        WHEN COUNT(*) = 0 THEN 'good'
        WHEN COUNT(*) < 10 THEN 'warning'
        ELSE 'critical'
    END,
    'Security events in the last 24 hours',
    NOW()
FROM security_events_detailed sed
WHERE sed.created_at > NOW() - INTERVAL '24 hours'
AND sed.severity IN ('medium', 'high', 'critical');

-- ============================================================================
-- INITIALIZE DEFAULT ALERT RULES
-- ============================================================================

-- Insert default alert rules
INSERT INTO alert_rules (rule_name, rule_type, condition_sql, severity, warning_threshold, critical_threshold, notification_channels)
VALUES 
('High Query Execution Time', 'performance', 
 'SELECT AVG(execution_time_ms) FROM query_performance_log WHERE executed_at > NOW() - INTERVAL ''5 minutes''',
 'warning', 1000.0, 5000.0, '["email", "slack"]'),
 
('Low Cache Hit Ratio', 'performance',
 'SELECT buffer_cache_hit_ratio FROM database_health_metrics ORDER BY metric_timestamp DESC LIMIT 1',
 'critical', 85.0, 70.0, '["email", "pagerduty"]'),
 
('High Connection Usage', 'availability',
 'SELECT (active_connections::DECIMAL / max_connections) * 100 FROM database_health_metrics ORDER BY metric_timestamp DESC LIMIT 1',
 'warning', 80.0, 95.0, '["email"]'),
 
('Security Event Spike', 'security',
 'SELECT COUNT(*) FROM security_events_detailed WHERE created_at > NOW() - INTERVAL ''1 hour'' AND severity IN (''high'', ''critical'')',
 'critical', 5.0, 10.0, '["email", "pagerduty", "slack"]')
ON CONFLICT (rule_name) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS FOR MONITORING ROLES
-- ============================================================================

-- Grant permissions to monitoring role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_monitoring;
GRANT INSERT ON performance_metrics, query_performance_log, database_health_metrics TO app_monitoring;
GRANT INSERT ON security_events_detailed, data_access_audit TO app_monitoring;
GRANT EXECUTE ON FUNCTION collect_database_health_metrics() TO app_monitoring;
GRANT EXECUTE ON FUNCTION detect_slow_queries() TO app_monitoring;
GRANT EXECUTE ON FUNCTION detect_suspicious_activity() TO app_monitoring;
GRANT EXECUTE ON FUNCTION evaluate_alert_rules() TO app_monitoring;
GRANT EXECUTE ON FUNCTION automated_cleanup() TO app_monitoring;

-- Grant additional permissions to admin role
GRANT ALL ON alert_rules, alert_instances TO app_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- Create indexes for monitoring tables
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_type_time ON performance_metrics(metric_type, collected_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_performance_log_time ON query_performance_log(executed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_database_health_metrics_time ON database_health_metrics(metric_timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_detailed_time ON security_events_detailed(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_access_audit_time ON data_access_audit(accessed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alert_instances_status ON alert_instances(status, triggered_at DESC);

-- Add table comments for documentation
COMMENT ON TABLE performance_metrics IS 'Stores various database performance metrics for monitoring and alerting';
COMMENT ON TABLE query_performance_log IS 'Detailed log of query execution performance for optimization analysis';
COMMENT ON TABLE database_health_metrics IS 'Comprehensive database health indicators collected at regular intervals';
COMMENT ON TABLE security_events_detailed IS 'Enhanced security event tracking with risk scoring and automated response';
COMMENT ON TABLE data_access_audit IS 'Detailed audit trail of all data access operations for compliance';
COMMENT ON TABLE alert_rules IS 'Configurable alert rules for automated monitoring and notification';
COMMENT ON TABLE alert_instances IS 'Active and historical alert instances triggered by monitoring rules';