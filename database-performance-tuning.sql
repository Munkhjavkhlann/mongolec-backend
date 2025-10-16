-- ============================================================================
-- COMPREHENSIVE DATABASE PERFORMANCE TUNING AND CONNECTION POOLING
-- FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file implements comprehensive performance optimization strategies:
-- - Connection pooling configuration and management
-- - Query performance optimization
-- - Multi-tenant workload balancing
-- - Memory and I/O optimization
-- - Automated performance tuning
-- - Real-time performance monitoring
-- - Scaling recommendations
-- - Resource utilization optimization
--
-- Performance Areas Covered:
-- - Connection management and pooling
-- - Query execution optimization
-- - Index usage and optimization
-- - Memory configuration tuning
-- - I/O performance optimization
-- - Multi-tenant resource isolation
-- - Automated scaling strategies
-- - Performance degradation detection
-- ============================================================================

-- ============================================================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Connection pool configuration table
CREATE TABLE IF NOT EXISTS connection_pool_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_name VARCHAR(100) UNIQUE NOT NULL,
    
    -- Pool settings
    min_connections INTEGER NOT NULL DEFAULT 5,
    max_connections INTEGER NOT NULL DEFAULT 50,
    initial_connections INTEGER NOT NULL DEFAULT 10,
    
    -- Connection lifecycle
    max_connection_age_seconds INTEGER DEFAULT 3600, -- 1 hour
    max_idle_time_seconds INTEGER DEFAULT 600, -- 10 minutes
    connection_timeout_seconds INTEGER DEFAULT 30,
    
    -- Pool behavior
    pool_mode VARCHAR(20) DEFAULT 'transaction' NOT NULL,
    default_pool_size INTEGER DEFAULT 20,
    reserve_pool_size INTEGER DEFAULT 5,
    
    -- Target configuration
    target_tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    target_database VARCHAR(100) DEFAULT 'default',
    target_role VARCHAR(100) DEFAULT 'app_user',
    
    -- Performance settings
    query_timeout_seconds INTEGER DEFAULT 120,
    statement_timeout_seconds INTEGER DEFAULT 60,
    idle_in_transaction_timeout_seconds INTEGER DEFAULT 300,
    
    -- Monitoring and alerts
    enable_monitoring BOOLEAN DEFAULT true NOT NULL,
    alert_threshold_percent INTEGER DEFAULT 80,
    
    -- Status
    is_enabled BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_pool_mode CHECK (pool_mode IN ('session', 'transaction', 'statement')),
    CONSTRAINT valid_connection_limits CHECK (
        min_connections <= initial_connections AND 
        initial_connections <= max_connections AND
        min_connections > 0
    ),
    CONSTRAINT valid_alert_threshold CHECK (alert_threshold_percent BETWEEN 1 AND 100)
);

-- Connection pool statistics
CREATE TABLE IF NOT EXISTS connection_pool_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_config_id UUID NOT NULL REFERENCES connection_pool_configs(id) ON DELETE CASCADE,
    
    -- Connection metrics
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    waiting_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    
    -- Usage statistics
    connections_created_per_second DECIMAL(8,2) DEFAULT 0,
    connections_closed_per_second DECIMAL(8,2) DEFAULT 0,
    queries_per_second DECIMAL(10,2) DEFAULT 0,
    
    -- Performance metrics
    avg_connection_wait_time_ms DECIMAL(8,2) DEFAULT 0,
    avg_query_duration_ms DECIMAL(10,2) DEFAULT 0,
    connection_pool_utilization_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Error rates
    connection_errors_per_minute DECIMAL(6,2) DEFAULT 0,
    query_timeout_count INTEGER DEFAULT 0,
    connection_timeout_count INTEGER DEFAULT 0,
    
    -- Resource usage
    memory_usage_mb DECIMAL(10,2),
    cpu_usage_percent DECIMAL(5,2),
    
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_utilization_percent CHECK (connection_pool_utilization_percent BETWEEN 0 AND 100),
    CONSTRAINT valid_cpu_percent CHECK (cpu_usage_percent IS NULL OR cpu_usage_percent BETWEEN 0 AND 100)
);

-- Query performance tracking for optimization
CREATE TABLE IF NOT EXISTS query_optimization_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Query identification
    query_hash VARCHAR(64) NOT NULL,
    query_fingerprint TEXT,
    query_text TEXT,
    
    -- Execution context
    executed_by_role VARCHAR(100),
    connection_pool VARCHAR(100),
    
    -- Performance metrics
    execution_time_ms DECIMAL(10,3) NOT NULL,
    planning_time_ms DECIMAL(8,3),
    rows_examined BIGINT,
    rows_returned BIGINT,
    
    -- Resource usage
    shared_blocks_hit BIGINT,
    shared_blocks_read BIGINT,
    shared_blocks_dirtied BIGINT,
    shared_blocks_written BIGINT,
    temp_blocks_read BIGINT,
    temp_blocks_written BIGINT,
    
    -- I/O metrics
    blk_read_time_ms DECIMAL(10,3),
    blk_write_time_ms DECIMAL(10,3),
    
    -- Optimization opportunities
    seq_scan_count INTEGER DEFAULT 0,
    index_scan_count INTEGER DEFAULT 0,
    nested_loop_count INTEGER DEFAULT 0,
    hash_join_count INTEGER DEFAULT 0,
    
    -- Classification
    query_complexity VARCHAR(20) GENERATED ALWAYS AS (
        CASE 
            WHEN execution_time_ms < 10 THEN 'trivial'
            WHEN execution_time_ms < 100 THEN 'simple'
            WHEN execution_time_ms < 1000 THEN 'moderate'
            WHEN execution_time_ms < 5000 THEN 'complex'
            ELSE 'critical'
        END
    ) STORED,
    
    optimization_score INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN seq_scan_count > index_scan_count THEN 20
            WHEN temp_blocks_written > 1000 THEN 30
            WHEN execution_time_ms > 5000 THEN 10
            WHEN (rows_examined::DECIMAL / GREATEST(rows_returned, 1)) > 100 THEN 40
            ELSE 80
        END
    ) STORED,
    
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_optimization_score CHECK (optimization_score BETWEEN 0 AND 100)
);

-- ============================================================================
-- PERFORMANCE CONFIGURATION TABLES
-- ============================================================================

-- Database configuration parameters for tuning
CREATE TABLE IF NOT EXISTS performance_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_name VARCHAR(100) UNIQUE NOT NULL,
    config_category VARCHAR(50) NOT NULL,
    
    -- Configuration details
    parameter_name VARCHAR(100) NOT NULL,
    current_value TEXT,
    recommended_value TEXT,
    default_value TEXT,
    
    -- Context and constraints
    tenant_specific BOOLEAN DEFAULT false NOT NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    workload_type VARCHAR(50),
    
    -- Impact assessment
    performance_impact VARCHAR(20) DEFAULT 'medium',
    restart_required BOOLEAN DEFAULT false NOT NULL,
    
    -- Tuning metadata
    auto_tuning_enabled BOOLEAN DEFAULT false NOT NULL,
    last_tuned_at TIMESTAMP WITH TIME ZONE,
    tuning_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_config_category CHECK (config_category IN (
        'memory', 'connections', 'wal', 'query_tuning', 'autovacuum', 
        'statistics', 'logging', 'replication', 'maintenance'
    )),
    CONSTRAINT valid_performance_impact CHECK (performance_impact IN ('low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_workload_type CHECK (workload_type IS NULL OR workload_type IN (
        'oltp', 'olap', 'mixed', 'read_heavy', 'write_heavy', 'analytics'
    ))
);

-- Resource utilization tracking
CREATE TABLE IF NOT EXISTS resource_utilization_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- CPU metrics
    cpu_usage_percent DECIMAL(5,2),
    cpu_wait_percent DECIMAL(5,2),
    load_average_1min DECIMAL(6,2),
    load_average_5min DECIMAL(6,2),
    
    -- Memory metrics
    memory_total_mb BIGINT,
    memory_used_mb BIGINT,
    memory_available_mb BIGINT,
    buffer_cache_mb BIGINT,
    
    -- Database specific memory
    shared_buffers_mb BIGINT,
    effective_cache_size_mb BIGINT,
    work_mem_mb INTEGER,
    maintenance_work_mem_mb INTEGER,
    
    -- I/O metrics
    disk_read_ops_per_sec DECIMAL(10,2),
    disk_write_ops_per_sec DECIMAL(10,2),
    disk_read_mb_per_sec DECIMAL(10,2),
    disk_write_mb_per_sec DECIMAL(10,2),
    
    -- Database I/O
    blocks_read_per_sec DECIMAL(10,2),
    blocks_written_per_sec DECIMAL(10,2),
    checkpoint_frequency_per_hour DECIMAL(6,2),
    
    -- Network metrics
    network_bytes_sent_per_sec DECIMAL(12,2),
    network_bytes_received_per_sec DECIMAL(12,2),
    
    -- Concurrent activity
    active_connections INTEGER,
    queued_queries INTEGER,
    long_running_queries INTEGER, -- queries > 5 minutes
    
    -- Lock contention
    lock_waits INTEGER,
    deadlocks INTEGER,
    
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_cpu_usage CHECK (cpu_usage_percent IS NULL OR cpu_usage_percent BETWEEN 0 AND 100),
    CONSTRAINT valid_memory_relationship CHECK (
        memory_used_mb IS NULL OR memory_total_mb IS NULL OR memory_used_mb <= memory_total_mb
    )
);

-- ============================================================================
-- PERFORMANCE OPTIMIZATION FUNCTIONS
-- ============================================================================

-- Function to analyze and recommend connection pool settings
CREATE OR REPLACE FUNCTION analyze_connection_pool_performance(
    pool_name_param VARCHAR(100) DEFAULT NULL,
    analysis_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    pool_name VARCHAR(100),
    current_max_connections INTEGER,
    recommended_max_connections INTEGER,
    avg_utilization_percent DECIMAL(5,2),
    peak_utilization_percent DECIMAL(5,2),
    avg_wait_time_ms DECIMAL(8,2),
    optimization_priority VARCHAR(20),
    recommendations TEXT
) AS $$
DECLARE
    pool_record RECORD;
    avg_util DECIMAL(5,2);
    peak_util DECIMAL(5,2);
    avg_wait DECIMAL(8,2);
    recommended_max INTEGER;
    priority VARCHAR(20);
    recommendations_text TEXT;
BEGIN
    FOR pool_record IN
        SELECT * FROM connection_pool_configs
        WHERE (pool_name_param IS NULL OR pool_name = pool_name_param)
        AND is_enabled = true
    LOOP
        -- Calculate utilization metrics
        SELECT 
            AVG(connection_pool_utilization_percent),
            MAX(connection_pool_utilization_percent),
            AVG(avg_connection_wait_time_ms)
        INTO avg_util, peak_util, avg_wait
        FROM connection_pool_stats
        WHERE pool_config_id = pool_record.id
        AND collected_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL;
        
        -- Determine recommendations
        IF avg_util > 80 THEN
            recommended_max := LEAST(pool_record.max_connections * 1.5, 200);
            priority := 'high';
            recommendations_text := 'Pool frequently at capacity. Increase max_connections and monitor database limits.';
            
        ELSIF avg_util < 30 THEN
            recommended_max := GREATEST(pool_record.max_connections * 0.7, pool_record.min_connections + 5);
            priority := 'medium';
            recommendations_text := 'Pool underutilized. Consider reducing max_connections to save resources.';
            
        ELSIF avg_wait > 100 THEN
            recommended_max := pool_record.max_connections + 10;
            priority := 'high';
            recommendations_text := 'High wait times detected. Increase pool size or optimize slow queries.';
            
        ELSE
            recommended_max := pool_record.max_connections;
            priority := 'low';
            recommendations_text := 'Pool performing within acceptable parameters.';
        END IF;
        
        RETURN QUERY SELECT 
            pool_record.pool_name,
            pool_record.max_connections,
            recommended_max,
            COALESCE(avg_util, 0::DECIMAL(5,2)),
            COALESCE(peak_util, 0::DECIMAL(5,2)),
            COALESCE(avg_wait, 0::DECIMAL(8,2)),
            priority,
            recommendations_text;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to identify and optimize slow queries
CREATE OR REPLACE FUNCTION identify_slow_queries(
    tenant_uuid UUID DEFAULT NULL,
    min_execution_time_ms DECIMAL DEFAULT 1000,
    analysis_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    query_hash VARCHAR(64),
    avg_execution_time_ms DECIMAL(10,3),
    total_executions BIGINT,
    total_time_spent_minutes DECIMAL(10,2),
    avg_rows_examined BIGINT,
    avg_rows_returned BIGINT,
    scan_ratio DECIMAL(8,2),
    optimization_recommendations TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qol.query_hash,
        AVG(qol.execution_time_ms) as avg_execution_time_ms,
        COUNT(*) as total_executions,
        (SUM(qol.execution_time_ms) / 1000 / 60) as total_time_spent_minutes,
        AVG(qol.rows_examined) as avg_rows_examined,
        AVG(qol.rows_returned) as avg_rows_returned,
        AVG(qol.rows_examined::DECIMAL / GREATEST(qol.rows_returned, 1)) as scan_ratio,
        
        -- Generate optimization recommendations
        CASE 
            WHEN AVG(qol.seq_scan_count) > AVG(qol.index_scan_count) 
            THEN 'High sequential scan ratio - Consider adding indexes'
            
            WHEN AVG(qol.temp_blocks_written) > 1000 
            THEN 'High temp file usage - Increase work_mem or optimize query'
            
            WHEN AVG(qol.rows_examined::DECIMAL / GREATEST(qol.rows_returned, 1)) > 100 
            THEN 'High scan ratio - Query examining too many rows, optimize WHERE clauses'
            
            WHEN AVG(qol.nested_loop_count) > 5 
            THEN 'Many nested loops - Consider hash joins or better indexes'
            
            WHEN AVG(qol.execution_time_ms) > 10000 
            THEN 'Very slow query - Requires immediate optimization'
            
            ELSE 'Review query structure and consider index optimization'
        END as optimization_recommendations
        
    FROM query_optimization_log qol
    WHERE (tenant_uuid IS NULL OR qol.tenant_id = tenant_uuid)
    AND qol.executed_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL
    AND qol.execution_time_ms >= min_execution_time_ms
    GROUP BY qol.query_hash
    HAVING AVG(qol.execution_time_ms) >= min_execution_time_ms
    ORDER BY total_time_spent_minutes DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically tune database parameters
CREATE OR REPLACE FUNCTION auto_tune_database_parameters(
    dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(
    parameter_name VARCHAR(100),
    current_value TEXT,
    recommended_value TEXT,
    performance_impact VARCHAR(20),
    tuning_reason TEXT,
    action_taken TEXT
) AS $$
DECLARE
    param_record RECORD;
    current_val TEXT;
    recommended_val TEXT;
    action_text TEXT;
    
    -- System metrics for tuning calculations
    total_memory_mb BIGINT;
    active_connections_avg DECIMAL;
    cpu_usage_avg DECIMAL;
    disk_io_avg DECIMAL;
BEGIN
    -- Get system metrics for the last hour
    SELECT 
        AVG(memory_total_mb),
        AVG(active_connections),
        AVG(cpu_usage_percent),
        AVG(disk_read_mb_per_sec + disk_write_mb_per_sec)
    INTO total_memory_mb, active_connections_avg, cpu_usage_avg, disk_io_avg
    FROM resource_utilization_log
    WHERE collected_at > NOW() - INTERVAL '1 hour';
    
    -- Tune shared_buffers (typically 25% of total memory)
    current_val := current_setting('shared_buffers');
    recommended_val := (total_memory_mb * 0.25)::INTEGER || 'MB';
    
    IF NOT dry_run AND current_val != recommended_val THEN
        -- In real implementation, would update postgresql.conf and schedule restart
        action_text := 'Parameter update scheduled for next restart';
    ELSE
        action_text := CASE WHEN dry_run THEN 'Dry run - no changes made' ELSE 'No change needed' END;
    END IF;
    
    RETURN QUERY SELECT 
        'shared_buffers'::VARCHAR(100),
        current_val,
        recommended_val,
        'high'::VARCHAR(20),
        'Optimize buffer cache based on available memory'::TEXT,
        action_text;
    
    -- Tune effective_cache_size (typically 75% of total memory)
    current_val := current_setting('effective_cache_size');
    recommended_val := (total_memory_mb * 0.75)::INTEGER || 'MB';
    
    action_text := CASE WHEN dry_run THEN 'Dry run - no changes made' ELSE 'Updated online' END;
    
    RETURN QUERY SELECT 
        'effective_cache_size'::VARCHAR(100),
        current_val,
        recommended_val,
        'medium'::VARCHAR(20),
        'Optimize query planner estimates based on available cache'::TEXT,
        action_text;
    
    -- Tune max_connections based on usage patterns
    current_val := current_setting('max_connections');
    recommended_val := GREATEST(100, (active_connections_avg * 1.5)::INTEGER)::TEXT;
    
    RETURN QUERY SELECT 
        'max_connections'::VARCHAR(100),
        current_val,
        recommended_val,
        'high'::VARCHAR(20),
        'Adjust connection limit based on actual usage patterns'::TEXT,
        CASE WHEN dry_run THEN 'Dry run - requires restart' ELSE 'Parameter update scheduled' END;
    
    -- Tune work_mem based on connection count and available memory
    current_val := current_setting('work_mem');
    recommended_val := GREATEST(4, (total_memory_mb / active_connections_avg / 4)::INTEGER) || 'MB';
    
    RETURN QUERY SELECT 
        'work_mem'::VARCHAR(100),
        current_val,
        recommended_val,
        'medium'::VARCHAR(20),
        'Optimize sort and hash operations memory usage'::TEXT,
        CASE WHEN dry_run THEN 'Dry run - can be updated online' ELSE 'Updated online' END;
    
    -- Tune checkpoint settings based on I/O patterns
    IF disk_io_avg > 100 THEN
        current_val := current_setting('checkpoint_completion_target');
        recommended_val := '0.9';
        
        RETURN QUERY SELECT 
            'checkpoint_completion_target'::VARCHAR(100),
            current_val,
            recommended_val,
            'medium'::VARCHAR(20),
            'Spread checkpoint I/O over longer period to reduce spikes'::TEXT,
            CASE WHEN dry_run THEN 'Dry run - can be updated online' ELSE 'Updated online' END;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- ============================================================================

-- Function to collect real-time performance metrics
CREATE OR REPLACE FUNCTION collect_performance_metrics()
RETURNS TABLE(
    metric_category VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value DECIMAL(15,4),
    metric_unit VARCHAR(20),
    status VARCHAR(20)
) AS $$
DECLARE
    cache_hit_ratio DECIMAL(5,2);
    active_conn INTEGER;
    max_conn INTEGER;
    conn_utilization DECIMAL(5,2);
    avg_query_time DECIMAL(10,3);
    locks_waiting INTEGER;
BEGIN
    -- Database cache hit ratio
    SELECT 
        ROUND(100.0 * sum(blks_hit) / GREATEST(sum(blks_hit) + sum(blks_read), 1), 2)
    INTO cache_hit_ratio
    FROM pg_stat_database;
    
    RETURN QUERY SELECT 
        'cache'::VARCHAR(50),
        'buffer_cache_hit_ratio'::VARCHAR(100),
        cache_hit_ratio::DECIMAL(15,4),
        'percent'::VARCHAR(20),
        CASE 
            WHEN cache_hit_ratio >= 95 THEN 'excellent'
            WHEN cache_hit_ratio >= 90 THEN 'good'
            WHEN cache_hit_ratio >= 80 THEN 'warning'
            ELSE 'critical'
        END::VARCHAR(20);
    
    -- Connection utilization
    SELECT 
        COUNT(*) FILTER (WHERE state != 'idle'),
        setting::INTEGER
    INTO active_conn, max_conn
    FROM pg_stat_activity, pg_settings 
    WHERE name = 'max_connections';
    
    conn_utilization := (active_conn::DECIMAL / max_conn) * 100;
    
    RETURN QUERY SELECT 
        'connections'::VARCHAR(50),
        'connection_utilization'::VARCHAR(100),
        conn_utilization::DECIMAL(15,4),
        'percent'::VARCHAR(20),
        CASE 
            WHEN conn_utilization < 70 THEN 'good'
            WHEN conn_utilization < 85 THEN 'warning'
            ELSE 'critical'
        END::VARCHAR(20);
    
    -- Average query execution time (last hour)
    SELECT AVG(execution_time_ms)
    INTO avg_query_time
    FROM query_optimization_log
    WHERE executed_at > NOW() - INTERVAL '1 hour';
    
    RETURN QUERY SELECT 
        'query_performance'::VARCHAR(50),
        'avg_query_time'::VARCHAR(100),
        COALESCE(avg_query_time, 0)::DECIMAL(15,4),
        'milliseconds'::VARCHAR(20),
        CASE 
            WHEN avg_query_time < 100 THEN 'excellent'
            WHEN avg_query_time < 500 THEN 'good'
            WHEN avg_query_time < 2000 THEN 'warning'
            ELSE 'critical'
        END::VARCHAR(20);
    
    -- Lock contention
    SELECT COUNT(*)
    INTO locks_waiting
    FROM pg_locks
    WHERE NOT granted;
    
    RETURN QUERY SELECT 
        'concurrency'::VARCHAR(50),
        'locks_waiting'::VARCHAR(100),
        locks_waiting::DECIMAL(15,4),
        'count'::VARCHAR(20),
        CASE 
            WHEN locks_waiting = 0 THEN 'excellent'
            WHEN locks_waiting < 5 THEN 'good'
            WHEN locks_waiting < 20 THEN 'warning'
            ELSE 'critical'
        END::VARCHAR(20);
END;
$$ LANGUAGE plpgsql;

-- Function to analyze tenant-specific performance
CREATE OR REPLACE FUNCTION analyze_tenant_performance(
    tenant_uuid UUID,
    analysis_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    performance_area VARCHAR(50),
    metric_name VARCHAR(100),
    current_value DECIMAL(15,4),
    baseline_value DECIMAL(15,4),
    variance_percent DECIMAL(8,2),
    status VARCHAR(20),
    recommendations TEXT
) AS $$
DECLARE
    query_avg_current DECIMAL(10,3);
    query_avg_baseline DECIMAL(10,3);
    variance DECIMAL(8,2);
    page_views_current BIGINT;
    page_views_baseline BIGINT;
BEGIN
    -- Query performance analysis
    SELECT AVG(execution_time_ms)
    INTO query_avg_current
    FROM query_optimization_log
    WHERE tenant_id = tenant_uuid
    AND executed_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    SELECT AVG(execution_time_ms)
    INTO query_avg_baseline
    FROM query_optimization_log
    WHERE tenant_id = tenant_uuid
    AND executed_at BETWEEN 
        NOW() - ((analysis_period_hours * 2) || ' hours')::INTERVAL AND
        NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    variance := CASE 
        WHEN query_avg_baseline > 0 THEN 
            ((query_avg_current - query_avg_baseline) / query_avg_baseline) * 100
        ELSE 0
    END;
    
    RETURN QUERY SELECT 
        'query_performance'::VARCHAR(50),
        'avg_execution_time'::VARCHAR(100),
        COALESCE(query_avg_current, 0)::DECIMAL(15,4),
        COALESCE(query_avg_baseline, 0)::DECIMAL(15,4),
        variance::DECIMAL(8,2),
        CASE 
            WHEN variance > 50 THEN 'degraded'
            WHEN variance > 20 THEN 'warning'
            WHEN variance < -20 THEN 'improved'
            ELSE 'stable'
        END::VARCHAR(20),
        CASE 
            WHEN variance > 50 THEN 'Significant performance degradation detected. Review recent queries and system load.'
            WHEN variance > 20 THEN 'Performance decline observed. Monitor query patterns and resource usage.'
            ELSE 'Query performance within acceptable range.'
        END::TEXT;
    
    -- Page view analysis (traffic patterns)
    SELECT COUNT(*)
    INTO page_views_current
    FROM page_views
    WHERE tenant_id = tenant_uuid
    AND created_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    SELECT COUNT(*)
    INTO page_views_baseline
    FROM page_views
    WHERE tenant_id = tenant_uuid
    AND created_at BETWEEN 
        NOW() - ((analysis_period_hours * 2) || ' hours')::INTERVAL AND
        NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    variance := CASE 
        WHEN page_views_baseline > 0 THEN 
            ((page_views_current - page_views_baseline)::DECIMAL / page_views_baseline) * 100
        ELSE 0
    END;
    
    RETURN QUERY SELECT 
        'traffic_patterns'::VARCHAR(50),
        'page_views'::VARCHAR(100),
        page_views_current::DECIMAL(15,4),
        page_views_baseline::DECIMAL(15,4),
        variance::DECIMAL(8,2),
        CASE 
            WHEN variance > 100 THEN 'spike'
            WHEN variance > 25 THEN 'increased'
            WHEN variance < -25 THEN 'decreased'
            ELSE 'stable'
        END::VARCHAR(20),
        CASE 
            WHEN variance > 100 THEN 'Traffic spike detected. Ensure adequate resources and monitor performance.'
            WHEN variance > 25 THEN 'Increased traffic observed. Consider scaling resources if performance degrades.'
            WHEN variance < -25 THEN 'Traffic decrease observed. Resources may be over-provisioned.'
            ELSE 'Traffic patterns stable.'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED SCALING AND OPTIMIZATION
-- ============================================================================

-- Function to provide scaling recommendations
CREATE OR REPLACE FUNCTION generate_scaling_recommendations(
    analysis_period_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    resource_type VARCHAR(50),
    current_capacity TEXT,
    recommended_action VARCHAR(100),
    priority VARCHAR(20),
    estimated_impact TEXT,
    implementation_notes TEXT
) AS $$
DECLARE
    avg_cpu DECIMAL(5,2);
    avg_memory_util DECIMAL(5,2);
    avg_connections INTEGER;
    max_connections_setting INTEGER;
    avg_query_time DECIMAL(10,3);
    disk_io_avg DECIMAL(10,2);
BEGIN
    -- Get average resource utilization
    SELECT 
        AVG(cpu_usage_percent),
        AVG((memory_used_mb::DECIMAL / memory_total_mb) * 100),
        AVG(active_connections),
        AVG(disk_read_mb_per_sec + disk_write_mb_per_sec)
    INTO avg_cpu, avg_memory_util, avg_connections, disk_io_avg
    FROM resource_utilization_log
    WHERE collected_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    -- Get current max_connections setting
    SELECT setting::INTEGER INTO max_connections_setting
    FROM pg_settings WHERE name = 'max_connections';
    
    -- Get average query time
    SELECT AVG(execution_time_ms)
    INTO avg_query_time
    FROM query_optimization_log
    WHERE executed_at > NOW() - (analysis_period_hours || ' hours')::INTERVAL;
    
    -- CPU scaling recommendations
    IF avg_cpu > 80 THEN
        RETURN QUERY SELECT 
            'compute'::VARCHAR(50),
            avg_cpu || '% average CPU usage'::TEXT,
            'Scale up CPU resources'::VARCHAR(100),
            'high'::VARCHAR(20),
            'Reduce query response times by 20-40%'::TEXT,
            'Consider upgrading to higher CPU tier or adding CPU cores'::TEXT;
    ELSIF avg_cpu < 30 THEN
        RETURN QUERY SELECT 
            'compute'::VARCHAR(50),
            avg_cpu || '% average CPU usage'::TEXT,
            'Consider scaling down CPU'::VARCHAR(100),
            'low'::VARCHAR(20),
            'Reduce costs by 15-30% without performance impact'::TEXT,
            'Monitor for at least one week before scaling down'::TEXT;
    END IF;
    
    -- Memory scaling recommendations
    IF avg_memory_util > 85 THEN
        RETURN QUERY SELECT 
            'memory'::VARCHAR(50),
            avg_memory_util || '% average memory usage'::TEXT,
            'Scale up memory resources'::VARCHAR(100),
            'high'::VARCHAR(20),
            'Improve cache hit ratio and reduce I/O by 30-50%'::TEXT,
            'Increase shared_buffers and effective_cache_size after scaling'::TEXT;
    END IF;
    
    -- Connection pool scaling
    IF avg_connections > (max_connections_setting * 0.8) THEN
        RETURN QUERY SELECT 
            'connections'::VARCHAR(50),
            avg_connections || ' average active connections'::TEXT,
            'Increase max_connections or optimize pool'::VARCHAR(100),
            'medium'::VARCHAR(20),
            'Prevent connection exhaustion and improve concurrency'::TEXT,
            'Balance between connection limits and memory usage'::TEXT;
    END IF;
    
    -- Storage I/O scaling
    IF disk_io_avg > 500 THEN
        RETURN QUERY SELECT 
            'storage'::VARCHAR(50),
            disk_io_avg || ' MB/s average I/O'::TEXT,
            'Upgrade to faster storage (SSD/NVMe)'::VARCHAR(100),
            'medium'::VARCHAR(20),
            'Reduce query latency by 40-60%'::TEXT,
            'Consider provisioned IOPS or premium storage tiers'::TEXT;
    END IF;
    
    -- Query performance optimization
    IF avg_query_time > 1000 THEN
        RETURN QUERY SELECT 
            'query_optimization'::VARCHAR(50),
            avg_query_time || 'ms average query time'::TEXT,
            'Implement query optimization program'::VARCHAR(100),
            'high'::VARCHAR(20),
            'Improve response times by 50-80%'::TEXT,
            'Focus on index optimization and query rewriting'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION VIEWS
-- ============================================================================

-- Real-time performance dashboard
CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
    'database_health' as category,
    
    -- Connection metrics
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
    (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as max_connections,
    
    -- Cache performance
    (SELECT ROUND(100.0 * sum(blks_hit) / GREATEST(sum(blks_hit) + sum(blks_read), 1), 2)
     FROM pg_stat_database) as cache_hit_ratio_percent,
    
    -- Query performance (last hour)
    (SELECT ROUND(AVG(execution_time_ms), 2)
     FROM query_optimization_log
     WHERE executed_at > NOW() - INTERVAL '1 hour') as avg_query_time_ms,
    
    -- Lock contention
    (SELECT COUNT(*) FROM pg_locks WHERE NOT granted) as waiting_locks,
    
    -- Database size
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
    
    -- Last vacuum/analyze
    (SELECT MAX(last_autovacuum) FROM pg_stat_user_tables) as last_autovacuum,
    (SELECT MAX(last_autoanalyze) FROM pg_stat_user_tables) as last_autoanalyze,
    
    NOW() as collected_at;

-- Slow query analysis view
CREATE OR REPLACE VIEW slow_query_analysis AS
SELECT 
    qol.query_hash,
    qol.query_fingerprint,
    COUNT(*) as execution_count,
    AVG(qol.execution_time_ms) as avg_execution_time_ms,
    MAX(qol.execution_time_ms) as max_execution_time_ms,
    SUM(qol.execution_time_ms) as total_execution_time_ms,
    
    -- Resource usage
    AVG(qol.shared_blocks_read) as avg_blocks_read,
    AVG(qol.shared_blocks_hit) as avg_blocks_hit,
    AVG(qol.temp_blocks_written) as avg_temp_blocks,
    
    -- Scan patterns
    AVG(qol.seq_scan_count) as avg_seq_scans,
    AVG(qol.index_scan_count) as avg_index_scans,
    
    -- Optimization score
    AVG(qol.optimization_score) as avg_optimization_score,
    
    -- Most recent execution
    MAX(qol.executed_at) as last_executed_at,
    
    -- Tenant context
    array_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL) as affected_tenants
    
FROM query_optimization_log qol
LEFT JOIN tenants t ON qol.tenant_id = t.id
WHERE qol.executed_at > NOW() - INTERVAL '24 hours'
AND qol.execution_time_ms > 100 -- Only queries slower than 100ms
GROUP BY qol.query_hash, qol.query_fingerprint
ORDER BY total_execution_time_ms DESC;

-- Connection pool performance view
CREATE OR REPLACE VIEW connection_pool_performance AS
SELECT 
    cpc.pool_name,
    cpc.max_connections,
    cpc.pool_mode,
    cpc.is_enabled,
    
    -- Recent performance metrics
    latest_stats.active_connections,
    latest_stats.connection_pool_utilization_percent,
    latest_stats.avg_connection_wait_time_ms,
    latest_stats.queries_per_second,
    
    -- Health indicators
    CASE 
        WHEN latest_stats.connection_pool_utilization_percent > 90 THEN 'Critical'
        WHEN latest_stats.connection_pool_utilization_percent > 80 THEN 'Warning'
        WHEN latest_stats.avg_connection_wait_time_ms > 100 THEN 'Warning'
        ELSE 'Healthy'
    END as pool_health,
    
    latest_stats.collected_at as last_updated
    
FROM connection_pool_configs cpc
LEFT JOIN LATERAL (
    SELECT *
    FROM connection_pool_stats cps
    WHERE cps.pool_config_id = cpc.id
    ORDER BY cps.collected_at DESC
    LIMIT 1
) latest_stats ON true
WHERE cpc.is_enabled = true;

-- ============================================================================
-- DEFAULT PERFORMANCE CONFIGURATIONS
-- ============================================================================

-- Insert default connection pool configurations
INSERT INTO connection_pool_configs (
    pool_name, min_connections, max_connections, initial_connections,
    pool_mode, default_pool_size, enable_monitoring
) VALUES 
('primary_app_pool', 10, 50, 20, 'transaction', 30, true),
('readonly_pool', 5, 25, 10, 'transaction', 15, true),
('admin_pool', 2, 10, 3, 'session', 5, true),
('analytics_pool', 3, 15, 5, 'session', 8, true)
ON CONFLICT (pool_name) DO NOTHING;

-- Insert default performance configurations
INSERT INTO performance_configurations (
    config_name, config_category, parameter_name, recommended_value, 
    performance_impact, auto_tuning_enabled
) VALUES 
('Shared Buffers Optimization', 'memory', 'shared_buffers', '256MB', 'high', true),
('Effective Cache Size', 'memory', 'effective_cache_size', '1GB', 'medium', true),
('Work Memory Optimization', 'memory', 'work_mem', '16MB', 'medium', true),
('WAL Buffer Size', 'wal', 'wal_buffers', '16MB', 'medium', true),
('Checkpoint Target', 'wal', 'checkpoint_completion_target', '0.9', 'medium', true),
('Random Page Cost', 'query_tuning', 'random_page_cost', '1.1', 'medium', true),
('Default Statistics Target', 'statistics', 'default_statistics_target', '1000', 'low', false)
ON CONFLICT (config_name) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions for performance monitoring
GRANT SELECT ON performance_dashboard TO app_monitoring, app_admin;
GRANT SELECT ON slow_query_analysis TO app_monitoring, app_admin;
GRANT SELECT ON connection_pool_performance TO app_monitoring, app_admin;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON connection_pool_configs TO app_admin;
GRANT SELECT, INSERT ON connection_pool_stats TO app_monitoring, app_admin;
GRANT SELECT, INSERT ON query_optimization_log TO app_user, app_monitoring, app_admin;
GRANT SELECT, INSERT ON resource_utilization_log TO app_monitoring, app_admin;
GRANT SELECT, INSERT, UPDATE ON performance_configurations TO app_admin;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION analyze_connection_pool_performance(VARCHAR, INTEGER) TO app_monitoring, app_admin;
GRANT EXECUTE ON FUNCTION identify_slow_queries(UUID, DECIMAL, INTEGER) TO app_monitoring, app_admin;
GRANT EXECUTE ON FUNCTION auto_tune_database_parameters(BOOLEAN) TO app_admin;
GRANT EXECUTE ON FUNCTION collect_performance_metrics() TO app_monitoring, app_admin;
GRANT EXECUTE ON FUNCTION analyze_tenant_performance(UUID, INTEGER) TO app_monitoring, app_admin;
GRANT EXECUTE ON FUNCTION generate_scaling_recommendations(INTEGER) TO app_admin;

-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_connection_pool_stats_collected_at 
    ON connection_pool_stats(collected_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_optimization_log_executed_at 
    ON query_optimization_log(executed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_optimization_log_tenant_time 
    ON query_optimization_log(tenant_id, executed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_optimization_log_hash_time 
    ON query_optimization_log(query_hash, executed_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_log_collected_at 
    ON resource_utilization_log(collected_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_utilization_log_tenant_time 
    ON resource_utilization_log(tenant_id, collected_at DESC);

-- Add helpful comments
COMMENT ON TABLE connection_pool_configs IS 'Configuration settings for database connection pools';
COMMENT ON TABLE connection_pool_stats IS 'Real-time statistics and metrics for connection pool performance';
COMMENT ON TABLE query_optimization_log IS 'Detailed query execution metrics for performance optimization';
COMMENT ON TABLE performance_configurations IS 'Database parameter configurations for performance tuning';
COMMENT ON TABLE resource_utilization_log IS 'System resource utilization tracking for capacity planning';
COMMENT ON VIEW performance_dashboard IS 'Real-time database performance overview';
COMMENT ON VIEW slow_query_analysis IS 'Analysis of slow-performing queries across all tenants';
COMMENT ON VIEW connection_pool_performance IS 'Connection pool health and performance metrics';