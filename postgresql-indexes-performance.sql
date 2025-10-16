-- ============================================================================
-- PERFORMANCE OPTIMIZED INDEXES FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file contains comprehensive indexing strategies optimized for:
-- - Multi-tenant workloads with tenant_id filtering
-- - High-performance content queries (news, blogs, programs)
-- - Full-text search capabilities
-- - Analytics and reporting queries
-- - User authentication and session management
-- - File management and media queries
--
-- Index Strategy:
-- - Tenant-first composite indexes for RLS efficiency
-- - Partial indexes for common query patterns
-- - Full-text search indexes with proper weighting
-- - Covering indexes for frequently accessed columns
-- - Performance monitoring indexes for optimization
-- ============================================================================

-- ============================================================================
-- TENANT-BASED CORE INDEXES
-- ============================================================================

-- Primary tenant identification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_slug_active 
    ON tenants(slug) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_subdomain_active 
    ON tenants(subdomain) 
    WHERE is_active = true AND subdomain IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_domain_active 
    ON tenants(domain) 
    WHERE is_active = true AND domain IS NOT NULL;

-- ============================================================================
-- USER MANAGEMENT INDEXES
-- ============================================================================

-- User authentication and lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_email 
    ON users(tenant_id, email) 
    WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_status 
    ON users(tenant_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
    ON users(email) 
    WHERE email_verified_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_tenant 
    ON users(tenant_id, role) 
    WHERE status = 'active';

-- User activity and security indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
    ON users(tenant_id, last_login_at DESC) 
    WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_failed_attempts 
    ON users(email, failed_login_attempts) 
    WHERE failed_login_attempts > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_locked_until 
    ON users(locked_until) 
    WHERE locked_until IS NOT NULL AND locked_until > NOW();

-- Password reset and verification indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_password_reset_token 
    ON users(password_reset_token) 
    WHERE password_reset_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verification_token 
    ON users(email_verification_token) 
    WHERE email_verification_token IS NOT NULL;

-- Admin users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_email_active 
    ON admin_users(email) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_role 
    ON admin_users(role) 
    WHERE is_active = true;

-- User sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_token 
    ON user_sessions(session_token) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_refresh_token 
    ON user_sessions(refresh_token) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active 
    ON user_sessions(user_id, tenant_id) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires 
    ON user_sessions(expires_at) 
    WHERE is_active = true;

-- Cleanup index for expired sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_cleanup 
    ON user_sessions(expires_at, is_active) 
    WHERE expires_at < NOW();

-- ============================================================================
-- CONTENT MANAGEMENT INDEXES
-- ============================================================================

-- Categories hierarchy and lookup indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_tenant_slug 
    ON categories(tenant_id, slug) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_tenant_parent 
    ON categories(tenant_id, parent_id, sort_order) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_path 
    ON categories USING GIN(string_to_array(path, '/')) 
    WHERE is_active = true;

-- Tags management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_tenant_name 
    ON tags(tenant_id, name) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_tenant_slug 
    ON tags(tenant_id, slug) 
    WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_usage_count 
    ON tags(tenant_id, usage_count DESC) 
    WHERE is_active = true;

-- ============================================================================
-- NEWS CONTENT INDEXES
-- ============================================================================

-- Primary news query indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_status_published 
    ON news(tenant_id, status, published_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_visibility_published 
    ON news(tenant_id, visibility, published_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_category_published 
    ON news(tenant_id, category_id, published_at DESC) 
    WHERE status = 'published';

-- News author and management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_author_status 
    ON news(author_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_author 
    ON news(tenant_id, author_id, status);

-- News engagement and analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_view_count 
    ON news(tenant_id, view_count DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_like_count 
    ON news(tenant_id, like_count DESC) 
    WHERE status = 'published';

-- News scheduling and featured content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_scheduled 
    ON news(scheduled_at) 
    WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_featured 
    ON news(tenant_id, featured_until DESC) 
    WHERE is_breaking = true AND featured_until > NOW();

-- News slug lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_tenant_slug 
    ON news(tenant_id, slug) 
    WHERE status = 'published';

-- Full-text search index for news
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_search 
    ON news USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(excerpt, '') || ' ' || 
            COALESCE(content, '')
        )
    ) 
    WHERE status = 'published';

-- News search by title and excerpt (lighter index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_news_title_search 
    ON news USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(excerpt, '')
        )
    ) 
    WHERE status = 'published';

-- ============================================================================
-- BLOG CONTENT INDEXES
-- ============================================================================

-- Primary blog query indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_tenant_status_published 
    ON blogs(tenant_id, status, published_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_tenant_visibility_published 
    ON blogs(tenant_id, visibility, published_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_tenant_category_published 
    ON blogs(tenant_id, category_id, published_at DESC) 
    WHERE status = 'published';

-- Blog author and management indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_author_status 
    ON blogs(author_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_tenant_author 
    ON blogs(tenant_id, author_id, status);

-- Blog series indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_series 
    ON blogs(tenant_id, series_id, series_order) 
    WHERE series_id IS NOT NULL AND status = 'published';

-- Blog engagement indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_view_count 
    ON blogs(tenant_id, view_count DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_featured 
    ON blogs(tenant_id, is_featured, published_at DESC) 
    WHERE is_featured = true AND status = 'published';

-- Blog slug lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_tenant_slug 
    ON blogs(tenant_id, slug) 
    WHERE status = 'published';

-- Full-text search index for blogs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blogs_search 
    ON blogs USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(excerpt, '') || ' ' || 
            COALESCE(content, '')
        )
    ) 
    WHERE status = 'published';

-- ============================================================================
-- PROGRAMS CONTENT INDEXES
-- ============================================================================

-- Primary programs query indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_tenant_status_published 
    ON programs(tenant_id, status, created_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_tenant_type_published 
    ON programs(tenant_id, program_type, start_date DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_tenant_difficulty 
    ON programs(tenant_id, difficulty_level, created_at DESC) 
    WHERE status = 'published';

-- Programs instructor and category indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_instructor 
    ON programs(instructor_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_tenant_category 
    ON programs(tenant_id, category_id, created_at DESC) 
    WHERE status = 'published';

-- Programs pricing and enrollment indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_free 
    ON programs(tenant_id, is_free, created_at DESC) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_price_range 
    ON programs(tenant_id, price_amount, currency) 
    WHERE status = 'published' AND is_free = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_enrollment 
    ON programs(tenant_id, enrollment_count DESC) 
    WHERE status = 'published';

-- Programs scheduling indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_start_date 
    ON programs(tenant_id, start_date) 
    WHERE status = 'published' AND start_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_registration_deadline 
    ON programs(registration_deadline) 
    WHERE status = 'published' AND registration_deadline IS NOT NULL;

-- Programs rating and reviews
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_rating 
    ON programs(tenant_id, rating_average DESC, rating_count DESC) 
    WHERE status = 'published' AND rating_count > 0;

-- Programs slug lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_tenant_slug 
    ON programs(tenant_id, slug) 
    WHERE status = 'published';

-- Full-text search index for programs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_programs_search 
    ON programs USING GIN(
        to_tsvector('english', 
            COALESCE(title, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(detailed_description, '')
        )
    ) 
    WHERE status = 'published';

-- ============================================================================
-- CONTENT RELATIONSHIPS INDEXES
-- ============================================================================

-- Content tags indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tags_content 
    ON content_tags(content_type, content_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tags_tag 
    ON content_tags(tag_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_tags_composite 
    ON content_tags(content_type, content_id, tag_id);

-- Comments indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_content 
    ON comments(tenant_id, content_type, content_id, status) 
    WHERE status = 'approved';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_author 
    ON comments(author_id, status, created_at DESC) 
    WHERE author_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_moderation 
    ON comments(tenant_id, status, created_at) 
    WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_thread 
    ON comments(parent_id, created_at) 
    WHERE parent_id IS NOT NULL;

-- Content reactions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_reactions_content 
    ON content_reactions(content_type, content_id, reaction_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_reactions_user 
    ON content_reactions(user_id, created_at DESC);

-- ============================================================================
-- MEDIA AND FILE MANAGEMENT INDEXES
-- ============================================================================

-- Media files primary indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_tenant_type 
    ON media_files(tenant_id, file_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_uploader 
    ON media_files(uploaded_by, created_at DESC) 
    WHERE uploaded_by IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_public 
    ON media_files(tenant_id, is_public, created_at DESC) 
    WHERE is_public = true;

-- Media files organization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_folder 
    ON media_files(tenant_id, folder_path, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_access_level 
    ON media_files(tenant_id, access_level, created_at DESC);

-- Media files search and management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_name_search 
    ON media_files USING GIN(
        to_tsvector('english', 
            COALESCE(original_name, '') || ' ' || 
            COALESCE(alt_text, '') || ' ' || 
            COALESCE(caption, '')
        )
    );

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_hash 
    ON media_files(file_hash) 
    WHERE file_hash IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_files_usage 
    ON media_files(tenant_id, usage_count DESC);

-- ============================================================================
-- ANALYTICS AND TRACKING INDEXES
-- ============================================================================

-- Page views analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_tenant_date 
    ON page_views(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_content 
    ON page_views(tenant_id, content_type, content_id, created_at DESC) 
    WHERE content_type IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_user 
    ON page_views(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_path 
    ON page_views(tenant_id, path, created_at DESC);

-- Geographic analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_geographic 
    ON page_views(tenant_id, country, region, created_at DESC) 
    WHERE country IS NOT NULL;

-- Device and browser analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_device 
    ON page_views(tenant_id, device_type, created_at DESC) 
    WHERE device_type IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_browser 
    ON page_views(tenant_id, browser, created_at DESC) 
    WHERE browser IS NOT NULL;

-- Referrer analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_page_views_referrer 
    ON page_views(tenant_id, referrer, created_at DESC) 
    WHERE referrer IS NOT NULL;

-- API usage analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_tenant_date 
    ON api_usage_logs(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_endpoint 
    ON api_usage_logs(tenant_id, endpoint, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_status 
    ON api_usage_logs(tenant_id, status_code, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_response_time 
    ON api_usage_logs(tenant_id, response_time_ms DESC, created_at DESC);

-- User API usage tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_usage_user 
    ON api_usage_logs(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

-- ============================================================================
-- SETTINGS AND CONFIGURATION INDEXES
-- ============================================================================

-- Tenant settings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings_key 
    ON tenant_settings(tenant_id, setting_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings_type 
    ON tenant_settings(tenant_id, setting_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_settings_public 
    ON tenant_settings(tenant_id, is_public) 
    WHERE is_public = true;

-- System settings indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_key 
    ON system_settings(setting_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_settings_type 
    ON system_settings(setting_type);

-- ============================================================================
-- AUDIT AND SECURITY INDEXES
-- ============================================================================

-- Tenant audit log indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_audit_log_tenant_date 
    ON tenant_audit_log(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_audit_log_action 
    ON tenant_audit_log(tenant_id, action, created_at DESC);

-- General audit logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_tenant_date 
    ON audit_logs(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user 
    ON audit_logs(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_admin_user 
    ON audit_logs(admin_user_id, created_at DESC) 
    WHERE admin_user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_resource 
    ON audit_logs(tenant_id, action, resource_type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_risk_level 
    ON audit_logs(tenant_id, risk_level, created_at DESC) 
    WHERE risk_level IN ('high', 'critical');

-- Security events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_tenant_date 
    ON security_events(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_type_severity 
    ON security_events(tenant_id, event_type, severity, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_user 
    ON security_events(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_blocked 
    ON security_events(tenant_id, blocked, created_at DESC) 
    WHERE blocked = true;

-- ============================================================================
-- MAINTENANCE AND CLEANUP INDEXES
-- ============================================================================

-- Schema migrations tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schema_migrations_version 
    ON schema_migrations(version);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schema_migrations_applied 
    ON schema_migrations(applied_at DESC);

-- ============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================================================

-- Multi-content search across all content types
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_multi_content_search 
    ON news USING GIN(to_tsvector('english', title || ' ' || COALESCE(excerpt, ''))) 
    WHERE status = 'published';

-- User dashboard queries (covering index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_dashboard_news 
    ON news(tenant_id, author_id, status, created_at DESC, updated_at, title) 
    WHERE author_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_dashboard_blogs 
    ON blogs(tenant_id, author_id, status, created_at DESC, updated_at, title) 
    WHERE author_id IS NOT NULL;

-- Content management dashboard (covering index for admin views)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_management_news 
    ON news(tenant_id, status, created_at DESC, author_id, title, view_count);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_management_blogs 
    ON blogs(tenant_id, status, created_at DESC, author_id, title, view_count);

-- Popular content queries (covering indexes)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popular_news 
    ON news(tenant_id, status, view_count DESC, published_at DESC, title, slug) 
    WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_popular_blogs 
    ON blogs(tenant_id, status, view_count DESC, published_at DESC, title, slug) 
    WHERE status = 'published';

-- ============================================================================
-- PERFORMANCE MONITORING INDEXES
-- ============================================================================

-- Indexes to monitor database performance and identify slow queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitor_large_content 
    ON news(tenant_id, LENGTH(content)) 
    WHERE LENGTH(content) > 50000;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitor_old_drafts 
    ON news(tenant_id, status, created_at) 
    WHERE status = 'draft' AND created_at < NOW() - INTERVAL '30 days';

-- Monitor unused media files
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monitor_unused_media 
    ON media_files(tenant_id, usage_count, created_at) 
    WHERE usage_count = 0 AND created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner optimization
-- This should be run after creating indexes and loading data

ANALYZE tenants;
ANALYZE users;
ANALYZE admin_users;
ANALYZE user_sessions;
ANALYZE categories;
ANALYZE tags;
ANALYZE news;
ANALYZE blogs;
ANALYZE programs;
ANALYZE content_tags;
ANALYZE comments;
ANALYZE content_reactions;
ANALYZE media_files;
ANALYZE page_views;
ANALYZE api_usage_logs;
ANALYZE tenant_settings;
ANALYZE system_settings;
ANALYZE audit_logs;
ANALYZE security_events;
ANALYZE schema_migrations;

-- ============================================================================
-- INDEX MAINTENANCE PROCEDURES
-- ============================================================================

-- Function to monitor index usage and identify unused indexes
CREATE OR REPLACE FUNCTION monitor_index_usage()
RETURNS TABLE(
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_scans BIGINT,
    tuples_read BIGINT,
    tuples_fetched BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexrelname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
    FROM pg_stat_user_indexes 
    ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify missing indexes based on query patterns
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
    suggestion TEXT,
    reason TEXT,
    estimated_benefit TEXT
) AS $$
BEGIN
    -- This is a placeholder for index suggestion logic
    -- In practice, you would analyze pg_stat_statements to identify
    -- frequently executed queries that might benefit from additional indexes
    
    RETURN QUERY
    SELECT 
        'Monitor pg_stat_statements for slow queries'::TEXT,
        'Analyze actual query patterns to identify missing indexes'::TEXT,
        'Significant performance improvement possible'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to reindex tables during maintenance windows
CREATE OR REPLACE FUNCTION maintenance_reindex_tables()
RETURNS TEXT AS $$
DECLARE
    table_record RECORD;
    result_text TEXT := '';
BEGIN
    -- Reindex tables that might benefit from periodic maintenance
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('news', 'blogs', 'programs', 'page_views', 'audit_logs')
    LOOP
        EXECUTE format('REINDEX TABLE %I', table_record.tablename);
        result_text := result_text || 'Reindexed table: ' || table_record.tablename || E'\n';
    END LOOP;
    
    RETURN result_text;
END;
$$ LANGUAGE plpgsql;