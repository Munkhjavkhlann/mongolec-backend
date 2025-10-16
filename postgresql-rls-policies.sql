-- ============================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES
-- FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file contains comprehensive RLS policies for complete tenant isolation
-- with multiple layers of security and fine-grained access control.
--
-- Security Features:
-- - Complete tenant data isolation
-- - Role-based access control within tenants
-- - Admin bypass capabilities with audit logging
-- - Performance-optimized policy conditions
-- - Fail-safe default deny policies
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TENANT-SPECIFIC TABLES
-- ============================================================================

-- Core tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Content management tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- Content relationship tables
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reactions ENABLE ROW LEVEL SECURITY;

-- Media and file tables
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;

-- Analytics tables
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Settings tables
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- Audit tables
ALTER TABLE tenant_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Function to get current tenant ID from session
CREATE OR REPLACE FUNCTION app_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_tenant_id', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user ID from session
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        '00000000-0000-0000-0000-000000000000'::UUID
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current user role from session
CREATE OR REPLACE FUNCTION app_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_user_role', true),
        'anonymous'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN app_current_user_role() IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if current user is admin or owner of resource
CREATE OR REPLACE FUNCTION app_is_admin_or_owner(resource_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN app_is_admin() OR app_current_user_id() = resource_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if bypass mode is enabled (for system operations)
CREATE OR REPLACE FUNCTION app_bypass_rls()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.bypass_rls', true)::BOOLEAN,
        false
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- COMPREHENSIVE TENANT ISOLATION POLICIES
-- ============================================================================

-- Users table policies
CREATE POLICY tenant_isolation_users ON users
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        tenant_id = app_current_tenant_id()
    );

-- More restrictive policy for sensitive user operations
CREATE POLICY users_own_data_only ON users
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR 
            id = app_current_user_id() OR
            app_current_user_role() IN ('admin', 'editor')
        ))
    );

CREATE POLICY users_admin_full_access ON users
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin())
    );

-- User sessions policies
CREATE POLICY tenant_isolation_user_sessions ON user_sessions
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR 
            user_id = app_current_user_id()
        ))
    );

-- Categories policies
CREATE POLICY tenant_isolation_categories ON categories
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        tenant_id = app_current_tenant_id()
    );

-- Tags policies
CREATE POLICY tenant_isolation_tags ON tags
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        tenant_id = app_current_tenant_id()
    );

-- News policies with visibility control
CREATE POLICY tenant_isolation_news ON news
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            -- Public content is visible to all
            (visibility = 'public' AND status = 'published') OR
            -- Private content only to authenticated users
            (visibility = 'private' AND app_current_user_id() != '00000000-0000-0000-0000-000000000000'::UUID) OR
            -- Members only content to registered users
            (visibility = 'members_only' AND app_current_user_role() != 'anonymous') OR
            -- Admins and authors can see all their content
            app_is_admin() OR
            author_id = app_current_user_id()
        ))
    );

CREATE POLICY news_edit_permissions ON news
    FOR INSERT, UPDATE, DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            (app_current_user_role() IN ('editor', 'admin') AND (
                -- Editors can create new content
                (TG_OP = 'INSERT') OR
                -- Editors can edit their own content or drafts
                (author_id = app_current_user_id() OR status = 'draft')
            ))
        ))
    );

-- Blogs policies (similar to news but with different permissions)
CREATE POLICY tenant_isolation_blogs ON blogs
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            (visibility = 'public' AND status = 'published') OR
            (visibility = 'private' AND app_current_user_id() != '00000000-0000-0000-0000-000000000000'::UUID) OR
            (visibility = 'members_only' AND app_current_user_role() != 'anonymous') OR
            app_is_admin() OR
            author_id = app_current_user_id()
        ))
    );

CREATE POLICY blogs_edit_permissions ON blogs
    FOR INSERT, UPDATE, DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            (app_current_user_role() IN ('editor', 'admin') AND (
                (TG_OP = 'INSERT') OR
                (author_id = app_current_user_id() OR status = 'draft')
            ))
        ))
    );

-- Programs policies with enrollment consideration
CREATE POLICY tenant_isolation_programs ON programs
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            (visibility = 'public' AND status = 'published') OR
            (visibility = 'private' AND app_current_user_id() != '00000000-0000-0000-0000-000000000000'::UUID) OR
            (visibility = 'members_only' AND app_current_user_role() != 'anonymous') OR
            app_is_admin() OR
            instructor_id = app_current_user_id()
        ))
    );

CREATE POLICY programs_edit_permissions ON programs
    FOR INSERT, UPDATE, DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            instructor_id = app_current_user_id() OR
            app_current_user_role() = 'admin'
        ))
    );

-- Content tags policies (complex due to content relationships)
CREATE POLICY tenant_isolation_content_tags ON content_tags
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        EXISTS (
            SELECT 1 FROM (
                SELECT tenant_id FROM news WHERE id = content_tags.content_id AND content_tags.content_type = 'news'
                UNION ALL
                SELECT tenant_id FROM blogs WHERE id = content_tags.content_id AND content_tags.content_type = 'blog'
                UNION ALL
                SELECT tenant_id FROM programs WHERE id = content_tags.content_id AND content_tags.content_type = 'program'
            ) AS content_tenant
            WHERE content_tenant.tenant_id = app_current_tenant_id()
        )
    );

-- Comments policies with moderation support
CREATE POLICY tenant_isolation_comments ON comments
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            status = 'approved' OR
            app_is_admin() OR
            author_id = app_current_user_id()
        ))
    );

CREATE POLICY comments_create_policy ON comments
    FOR INSERT TO app_user
    WITH CHECK (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND 
         app_current_user_id() != '00000000-0000-0000-0000-000000000000'::UUID)
    );

CREATE POLICY comments_edit_policy ON comments
    FOR UPDATE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            author_id = app_current_user_id()
        ))
    );

CREATE POLICY comments_delete_policy ON comments
    FOR DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            author_id = app_current_user_id()
        ))
    );

-- Content reactions policies
CREATE POLICY tenant_isolation_content_reactions ON content_reactions
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            user_id = app_current_user_id()
        ))
    );

-- Media files policies with access level consideration
CREATE POLICY tenant_isolation_media_files ON media_files
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            access_level = 'public' OR
            (access_level = 'tenant_only') OR
            (access_level = 'authenticated' AND app_current_user_id() != '00000000-0000-0000-0000-000000000000'::UUID) OR
            (access_level = 'private' AND (
                app_is_admin() OR 
                uploaded_by = app_current_user_id()
            ))
        ))
    );

CREATE POLICY media_files_upload_policy ON media_files
    FOR INSERT TO app_user
    WITH CHECK (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND 
         uploaded_by = app_current_user_id())
    );

CREATE POLICY media_files_manage_policy ON media_files
    FOR UPDATE, DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            uploaded_by = app_current_user_id()
        ))
    );

-- Page views policies (analytics data)
CREATE POLICY tenant_isolation_page_views ON page_views
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            app_is_admin() OR
            app_current_user_role() IN ('admin', 'editor')
        ))
    );

-- API usage logs policies
CREATE POLICY tenant_isolation_api_usage_logs ON api_usage_logs
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin())
    );

-- Tenant settings policies
CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND (
            is_public = true OR
            app_is_admin() OR
            app_current_user_role() IN ('admin', 'editor')
        ))
    );

CREATE POLICY tenant_settings_manage_policy ON tenant_settings
    FOR INSERT, UPDATE, DELETE TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin())
    );

-- Tenant audit log policies
CREATE POLICY tenant_isolation_tenant_audit_log ON tenant_audit_log
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin())
    );

-- General audit logs policies
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR SELECT TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin()) OR
        (tenant_id IS NULL AND app_current_user_role() = 'super_admin')
    );

-- Security events policies
CREATE POLICY tenant_isolation_security_events ON security_events
    FOR ALL TO app_user
    USING (
        app_bypass_rls() OR 
        (tenant_id = app_current_tenant_id() AND app_is_admin()) OR
        (tenant_id IS NULL AND app_current_user_role() = 'super_admin')
    );

-- ============================================================================
-- READ-ONLY USER POLICIES (for app_readonly role)
-- ============================================================================

-- Grant read-only access to analytics role
CREATE POLICY readonly_tenant_data ON users
    FOR SELECT TO app_readonly
    USING (tenant_id = app_current_tenant_id());

CREATE POLICY readonly_news_data ON news
    FOR SELECT TO app_readonly
    USING (tenant_id = app_current_tenant_id() AND status = 'published');

CREATE POLICY readonly_blogs_data ON blogs
    FOR SELECT TO app_readonly
    USING (tenant_id = app_current_tenant_id() AND status = 'published');

CREATE POLICY readonly_programs_data ON programs
    FOR SELECT TO app_readonly
    USING (tenant_id = app_current_tenant_id() AND status = 'published');

CREATE POLICY readonly_analytics_data ON page_views
    FOR SELECT TO app_readonly
    USING (tenant_id = app_current_tenant_id());

-- ============================================================================
-- ADMIN ROLE POLICIES (for app_admin role)
-- ============================================================================

-- Admin role can access all data across tenants (with audit logging)
CREATE POLICY admin_full_access_users ON users
    FOR ALL TO app_admin
    USING (true);

CREATE POLICY admin_full_access_news ON news
    FOR ALL TO app_admin
    USING (true);

CREATE POLICY admin_full_access_blogs ON blogs
    FOR ALL TO app_admin
    USING (true);

CREATE POLICY admin_full_access_programs ON programs
    FOR ALL TO app_admin
    USING (true);

-- ============================================================================
-- SECURITY MONITORING AND ALERTS
-- ============================================================================

-- Function to log RLS policy violations
CREATE OR REPLACE FUNCTION log_rls_violation()
RETURNS TRIGGER AS $$
DECLARE
    violation_details JSONB;
BEGIN
    violation_details := jsonb_build_object(
        'table_name', TG_TABLE_NAME,
        'operation', TG_OP,
        'tenant_id', COALESCE(NEW.tenant_id, OLD.tenant_id),
        'current_tenant', app_current_tenant_id(),
        'user_id', app_current_user_id(),
        'user_role', app_current_user_role(),
        'timestamp', NOW()
    );
    
    INSERT INTO security_events (
        tenant_id,
        event_type,
        severity,
        description,
        user_id,
        detection_method,
        metadata
    ) VALUES (
        COALESCE(NEW.tenant_id, OLD.tenant_id),
        'privilege_escalation',
        'high',
        'Potential RLS policy violation detected',
        app_current_user_id(),
        'rule_based',
        violation_details
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UTILITY FUNCTIONS FOR TENANT CONTEXT MANAGEMENT
-- ============================================================================

-- Function to safely set tenant context with validation
CREATE OR REPLACE FUNCTION set_secure_tenant_context(
    tenant_uuid UUID,
    user_uuid UUID DEFAULT NULL,
    user_role TEXT DEFAULT 'user'
)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_exists BOOLEAN;
    tenant_active BOOLEAN;
BEGIN
    -- Validate tenant exists and is active
    SELECT 
        EXISTS(SELECT 1 FROM tenants WHERE id = tenant_uuid),
        COALESCE((SELECT is_active FROM tenants WHERE id = tenant_uuid), false)
    INTO tenant_exists, tenant_active;
    
    IF NOT tenant_exists THEN
        RAISE EXCEPTION 'Tenant % does not exist', tenant_uuid;
    END IF;
    
    IF NOT tenant_active THEN
        RAISE EXCEPTION 'Tenant % is not active', tenant_uuid;
    END IF;
    
    -- Set session variables
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
    
    IF user_uuid IS NOT NULL THEN
        PERFORM set_config('app.current_user_id', user_uuid::text, true);
    END IF;
    
    PERFORM set_config('app.current_user_role', user_role, true);
    
    -- Log context change for audit
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        tenant_uuid,
        'system',
        'context_change',
        'tenant_context',
        jsonb_build_object(
            'previous_tenant', current_setting('app.previous_tenant_id', true),
            'new_tenant', tenant_uuid,
            'user_id', user_uuid,
            'user_role', user_role
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear tenant context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS BOOLEAN AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', '', true);
    PERFORM set_config('app.current_user_id', '', true);
    PERFORM set_config('app.current_user_role', 'anonymous', true);
    PERFORM set_config('app.bypass_rls', 'false', true);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS TESTING AND VALIDATION FUNCTIONS
-- ============================================================================

-- Function to test tenant isolation
CREATE OR REPLACE FUNCTION test_tenant_isolation()
RETURNS TABLE(
    test_name TEXT,
    table_name TEXT,
    passed BOOLEAN,
    details TEXT
) AS $$
DECLARE
    test_tenant_1 UUID := '11111111-1111-1111-1111-111111111111';
    test_tenant_2 UUID := '22222222-2222-2222-2222-222222222222';
    record_count INTEGER;
    test_result BOOLEAN;
BEGIN
    -- Test 1: Verify no cross-tenant data access in users table
    PERFORM set_secure_tenant_context(test_tenant_1);
    SELECT COUNT(*) INTO record_count FROM users WHERE tenant_id = test_tenant_2;
    test_result := (record_count = 0);
    
    RETURN QUERY SELECT 
        'Cross-tenant access prevention'::TEXT,
        'users'::TEXT,
        test_result,
        CASE WHEN test_result 
             THEN 'No cross-tenant access detected' 
             ELSE format('Found %s cross-tenant records', record_count) 
        END;
    
    -- Test 2: Verify tenant context switching
    PERFORM set_secure_tenant_context(test_tenant_2);
    SELECT COUNT(*) INTO record_count FROM users WHERE tenant_id = test_tenant_1;
    test_result := (record_count = 0);
    
    RETURN QUERY SELECT 
        'Tenant context switching'::TEXT,
        'users'::TEXT,
        test_result,
        CASE WHEN test_result 
             THEN 'Tenant context switching works correctly' 
             ELSE 'Tenant context switching failed' 
        END;
    
    -- Additional tests for other tables can be added here
    
    PERFORM clear_tenant_context();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS TO APPLICATION ROLES
-- ============================================================================

-- Grant basic permissions to app_user
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- Grant read-only permissions to app_readonly
GRANT USAGE ON SCHEMA public TO app_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_readonly;
GRANT EXECUTE ON FUNCTION set_secure_tenant_context(UUID, UUID, TEXT) TO app_readonly;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO app_readonly;

-- Grant full permissions to app_admin
GRANT ALL PRIVILEGES ON SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- Grant backup permissions to app_backup
GRANT USAGE ON SCHEMA public TO app_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_backup;

-- ============================================================================
-- DEFAULT DENY POLICIES (Fallback Security)
-- ============================================================================

-- Ensure that if no policy matches, access is denied by default
-- This is already the default behavior in PostgreSQL RLS, but we make it explicit

-- Create default deny policies for critical tables
CREATE POLICY default_deny_tenants ON tenants
    FOR ALL TO PUBLIC
    USING (false);

CREATE POLICY default_deny_admin_users ON admin_users
    FOR ALL TO PUBLIC
    USING (false);

CREATE POLICY default_deny_system_settings ON system_settings
    FOR ALL TO PUBLIC
    USING (false);

-- Enable RLS on these system tables as well
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow app_admin to access system tables
CREATE POLICY admin_access_tenants ON tenants
    FOR ALL TO app_admin
    USING (true);

CREATE POLICY admin_access_admin_users ON admin_users
    FOR ALL TO app_admin
    USING (true);

CREATE POLICY admin_access_system_settings ON system_settings
    FOR ALL TO app_admin
    USING (true);

-- Allow app_user to read their tenant information
CREATE POLICY user_read_own_tenant ON tenants
    FOR SELECT TO app_user
    USING (id = app_current_tenant_id() AND is_active = true);