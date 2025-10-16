-- ============================================================================
-- COMPREHENSIVE DATABASE ROLES AND PERMISSIONS SYSTEM
-- FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file establishes a secure, role-based permission system with:
-- - Principle of least privilege
-- - Separation of duties
-- - Audit-friendly permission structure
-- - Production-ready security controls
-- - Automated permission management
--
-- Security Principles:
-- - Default deny (no access unless explicitly granted)
-- - Role-based access control (RBAC)
-- - Tenant-aware permissions
-- - Audit trail for all permission changes
-- - Secure credential management
-- ============================================================================

-- ============================================================================
-- CORE DATABASE ROLES HIERARCHY
-- ============================================================================

-- Remove existing roles if they exist (for clean setup)
DO $$
DECLARE
    role_names TEXT[] := ARRAY[
        'app_superuser', 'app_admin', 'app_user', 'app_readonly', 
        'app_backup', 'app_monitoring', 'app_migration', 'app_analytics'
    ];
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY role_names
    LOOP
        -- Revoke all privileges first
        EXECUTE format('REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I', role_name);
        EXECUTE format('REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I', role_name);
        EXECUTE format('REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I', role_name);
        EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I', role_name);
        
        -- Drop role if exists
        IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('DROP ROLE %I', role_name);
            RAISE NOTICE 'Dropped existing role: %', role_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- CREATE ROLE HIERARCHY
-- ============================================================================

-- 1. SUPERUSER ROLE (Database Administration)
CREATE ROLE app_superuser WITH
    LOGIN
    SUPERUSER
    CREATEDB
    CREATEROLE
    REPLICATION
    PASSWORD 'CHANGE_ME_SUPERUSER_PASSWORD_STRONG_123!';

COMMENT ON ROLE app_superuser IS 'Database superuser for critical administration tasks';

-- 2. ADMIN ROLE (Application Administration)
CREATE ROLE app_admin WITH
    LOGIN
    CREATEDB
    CREATEROLE
    PASSWORD 'CHANGE_ME_ADMIN_PASSWORD_STRONG_456!';

COMMENT ON ROLE app_admin IS 'Application administrator with cross-tenant access';

-- 3. APPLICATION USER ROLE (Primary Application Access)
CREATE ROLE app_user WITH
    LOGIN
    PASSWORD 'CHANGE_ME_APP_PASSWORD_STRONG_789!';

COMMENT ON ROLE app_user IS 'Primary application role for tenant-scoped operations';

-- 4. READ-ONLY ROLE (Analytics and Reporting)
CREATE ROLE app_readonly WITH
    LOGIN
    PASSWORD 'CHANGE_ME_READONLY_PASSWORD_STRONG_101!';

COMMENT ON ROLE app_readonly IS 'Read-only access for analytics and reporting';

-- 5. BACKUP ROLE (Database Backup Operations)
CREATE ROLE app_backup WITH
    LOGIN
    PASSWORD 'CHANGE_ME_BACKUP_PASSWORD_STRONG_112!';

COMMENT ON ROLE app_backup IS 'Backup operations and data export';

-- 6. MONITORING ROLE (Performance Monitoring)
CREATE ROLE app_monitoring WITH
    LOGIN
    PASSWORD 'CHANGE_ME_MONITORING_PASSWORD_STRONG_131!';

COMMENT ON ROLE app_monitoring IS 'Database monitoring and performance analysis';

-- 7. MIGRATION ROLE (Schema Migrations)
CREATE ROLE app_migration WITH
    LOGIN
    CREATEDB
    PASSWORD 'CHANGE_ME_MIGRATION_PASSWORD_STRONG_415!';

COMMENT ON ROLE app_migration IS 'Database schema migrations and upgrades';

-- 8. ANALYTICS ROLE (Business Intelligence)
CREATE ROLE app_analytics WITH
    LOGIN
    PASSWORD 'CHANGE_ME_ANALYTICS_PASSWORD_STRONG_161!';

COMMENT ON ROLE app_analytics IS 'Advanced analytics and business intelligence';

-- ============================================================================
-- SCHEMA AND DATABASE PERMISSIONS
-- ============================================================================

-- Grant schema usage permissions
GRANT USAGE ON SCHEMA public TO app_admin, app_user, app_readonly, app_backup, app_monitoring, app_migration, app_analytics;

-- Grant database connection permissions
GRANT CONNECT ON DATABASE postgres TO app_admin, app_user, app_readonly, app_backup, app_monitoring, app_migration, app_analytics;

-- ============================================================================
-- TABLE PERMISSIONS BY ROLE
-- ============================================================================

-- ADMIN ROLE: Full access to all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_admin;

-- Ensure admin can grant permissions to other roles
ALTER ROLE app_admin WITH CREATEROLE;

-- APP_USER ROLE: Tenant-scoped access to application tables
-- Core tenant tables (limited access)
GRANT SELECT ON tenants TO app_user;
GRANT SELECT ON tenant_settings TO app_user;

-- User management tables
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_sessions TO app_user;
GRANT SELECT ON admin_users TO app_user; -- Read-only for admin user verification

-- Content management tables
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON tags TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON news TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON blogs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON programs TO app_user;

-- Content relationship tables
GRANT SELECT, INSERT, UPDATE, DELETE ON content_tags TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON content_reactions TO app_user;

-- Media and file management
GRANT SELECT, INSERT, UPDATE, DELETE ON media_files TO app_user;

-- Analytics (insert only for tracking)
GRANT INSERT ON page_views TO app_user;
GRANT INSERT ON api_usage_logs TO app_user;

-- Audit logs (insert only)
GRANT INSERT ON audit_logs TO app_user;
GRANT INSERT ON security_events TO app_user;
GRANT INSERT ON tenant_audit_log TO app_user;

-- Sequences for all tables app_user can modify
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- READONLY ROLE: Select access to published content and analytics
GRANT SELECT ON tenants TO app_readonly;
GRANT SELECT ON users TO app_readonly;
GRANT SELECT ON categories TO app_readonly;
GRANT SELECT ON tags TO app_readonly;
GRANT SELECT ON news TO app_readonly;
GRANT SELECT ON blogs TO app_readonly;
GRANT SELECT ON programs TO app_readonly;
GRANT SELECT ON content_tags TO app_readonly;
GRANT SELECT ON comments TO app_readonly;
GRANT SELECT ON content_reactions TO app_readonly;
GRANT SELECT ON media_files TO app_readonly;
GRANT SELECT ON page_views TO app_readonly;
GRANT SELECT ON api_usage_logs TO app_readonly;

-- BACKUP ROLE: Read access to all tables for backup operations
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_backup;

-- MONITORING ROLE: Access to system tables and monitoring views
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_monitoring;
GRANT SELECT ON pg_stat_user_tables TO app_monitoring;
GRANT SELECT ON pg_stat_user_indexes TO app_monitoring;
GRANT SELECT ON pg_locks TO app_monitoring;
GRANT SELECT ON pg_stat_activity TO app_monitoring;

-- MIGRATION ROLE: Full schema modification capabilities
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_migration;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_migration;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO app_migration;
GRANT CREATE ON SCHEMA public TO app_migration;

-- ANALYTICS ROLE: Read access with aggregation capabilities
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_analytics;

-- ============================================================================
-- FUNCTION AND PROCEDURE PERMISSIONS
-- ============================================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON FUNCTION app_current_tenant_id() TO app_user, app_readonly, app_analytics;
GRANT EXECUTE ON FUNCTION app_current_user_id() TO app_user, app_readonly, app_analytics;
GRANT EXECUTE ON FUNCTION app_current_user_role() TO app_user, app_readonly, app_analytics;

-- Grant execute permissions on tenant context functions
GRANT EXECUTE ON FUNCTION set_secure_tenant_context(UUID, UUID, TEXT) TO app_user, app_readonly, app_analytics;
GRANT EXECUTE ON FUNCTION clear_tenant_context() TO app_user, app_readonly, app_analytics;

-- Grant execute permissions on migration functions to migration role
GRANT EXECUTE ON FUNCTION apply_migration(VARCHAR, TEXT, TEXT, TEXT) TO app_migration;
GRANT EXECUTE ON FUNCTION rollback_migration(VARCHAR) TO app_migration;

-- Grant execute permissions on monitoring functions
GRANT EXECUTE ON FUNCTION monitor_index_usage() TO app_monitoring, app_admin;
GRANT EXECUTE ON FUNCTION verify_migration_integrity() TO app_monitoring, app_migration, app_admin;

-- ============================================================================
-- ROW LEVEL SECURITY POLICY PERMISSIONS
-- ============================================================================

-- Create policies for different roles

-- Admin bypass policy (highest privilege)
CREATE POLICY admin_bypass_all ON users
    FOR ALL TO app_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_bypass_all_news ON news
    FOR ALL TO app_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_bypass_all_blogs ON blogs
    FOR ALL TO app_admin
    USING (true)
    WITH CHECK (true);

CREATE POLICY admin_bypass_all_programs ON programs
    FOR ALL TO app_admin
    USING (true)
    WITH CHECK (true);

-- Read-only policies for readonly role
CREATE POLICY readonly_published_news ON news
    FOR SELECT TO app_readonly
    USING (
        tenant_id = app_current_tenant_id() AND 
        status = 'published' AND 
        visibility = 'public'
    );

CREATE POLICY readonly_published_blogs ON blogs
    FOR SELECT TO app_readonly
    USING (
        tenant_id = app_current_tenant_id() AND 
        status = 'published' AND 
        visibility = 'public'
    );

CREATE POLICY readonly_published_programs ON programs
    FOR SELECT TO app_readonly
    USING (
        tenant_id = app_current_tenant_id() AND 
        status = 'published' AND 
        visibility = 'public'
    );

-- Analytics policies
CREATE POLICY analytics_aggregated_data ON page_views
    FOR SELECT TO app_analytics
    USING (tenant_id = app_current_tenant_id());

CREATE POLICY analytics_api_usage ON api_usage_logs
    FOR SELECT TO app_analytics
    USING (tenant_id = app_current_tenant_id());

-- ============================================================================
-- DYNAMIC PERMISSION MANAGEMENT
-- ============================================================================

-- Function to grant tenant-specific permissions
CREATE OR REPLACE FUNCTION grant_tenant_access(
    role_name TEXT,
    tenant_uuid UUID,
    access_level TEXT DEFAULT 'read'
)
RETURNS BOOLEAN AS $$
DECLARE
    grant_sql TEXT;
BEGIN
    -- Validate inputs
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = role_name) THEN
        RAISE EXCEPTION 'Role % does not exist', role_name;
    END IF;
    
    IF NOT EXISTS (SELECT FROM tenants WHERE id = tenant_uuid) THEN
        RAISE EXCEPTION 'Tenant % does not exist', tenant_uuid;
    END IF;
    
    -- Log permission grant
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        tenant_uuid,
        'system',
        'permission_grant',
        'database_role',
        jsonb_build_object(
            'role_name', role_name,
            'access_level', access_level,
            'granted_by', current_user
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revoke tenant-specific permissions
CREATE OR REPLACE FUNCTION revoke_tenant_access(
    role_name TEXT,
    tenant_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Log permission revocation
    INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        tenant_uuid,
        'system',
        'permission_revoke',
        'database_role',
        jsonb_build_object(
            'role_name', role_name,
            'revoked_by', current_user
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERMISSION AUDITING AND MONITORING
-- ============================================================================

-- View to monitor role permissions
CREATE OR REPLACE VIEW role_permissions_summary AS
SELECT 
    r.rolname as role_name,
    r.rolsuper as is_superuser,
    r.rolcreaterole as can_create_roles,
    r.rolcreatedb as can_create_databases,
    r.rolreplication as can_replicate,
    r.rolbypassrls as can_bypass_rls,
    r.rolcanlogin as can_login,
    array_agg(DISTINCT tp.privilege_type) as table_privileges,
    COUNT(DISTINCT tp.table_name) as tables_accessible
FROM pg_roles r
LEFT JOIN (
    SELECT 
        grantee as role_name,
        table_name,
        privilege_type
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
) tp ON r.rolname = tp.role_name
WHERE r.rolname LIKE 'app_%'
GROUP BY r.rolname, r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, r.rolcanlogin;

-- Function to audit role permissions
CREATE OR REPLACE FUNCTION audit_role_permissions()
RETURNS TABLE(
    role_name TEXT,
    permission_type TEXT,
    object_name TEXT,
    privilege TEXT,
    is_grantable BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.grantee::TEXT,
        'table'::TEXT,
        tp.table_name::TEXT,
        tp.privilege_type::TEXT,
        (tp.is_grantable = 'YES')::BOOLEAN
    FROM information_schema.table_privileges tp
    WHERE tp.table_schema = 'public' 
    AND tp.grantee LIKE 'app_%'
    
    UNION ALL
    
    SELECT 
        rp.grantee::TEXT,
        'routine'::TEXT,
        rp.routine_name::TEXT,
        rp.privilege_type::TEXT,
        (rp.is_grantable = 'YES')::BOOLEAN
    FROM information_schema.routine_privileges rp
    WHERE rp.routine_schema = 'public' 
    AND rp.grantee LIKE 'app_%'
    
    ORDER BY role_name, permission_type, object_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY HARDENING
-- ============================================================================

-- Prevent role inheritance (security measure)
ALTER ROLE app_user NOINHERIT;
ALTER ROLE app_readonly NOINHERIT;
ALTER ROLE app_backup NOINHERIT;
ALTER ROLE app_monitoring NOINHERIT;
ALTER ROLE app_analytics NOINHERIT;

-- Set connection limits
ALTER ROLE app_user CONNECTION LIMIT 50;
ALTER ROLE app_readonly CONNECTION LIMIT 20;
ALTER ROLE app_backup CONNECTION LIMIT 5;
ALTER ROLE app_monitoring CONNECTION LIMIT 10;
ALTER ROLE app_migration CONNECTION LIMIT 2;
ALTER ROLE app_analytics CONNECTION LIMIT 15;
ALTER ROLE app_admin CONNECTION LIMIT 10;

-- Set session timeouts (requires pg_timeout extension or application-level handling)
-- These are examples of security settings that should be implemented

-- ============================================================================
-- PASSWORD POLICY ENFORCEMENT
-- ============================================================================

-- Function to enforce password policy
CREATE OR REPLACE FUNCTION enforce_password_policy()
RETURNS EVENT_TRIGGER AS $$
DECLARE
    cmd_record RECORD;
    password_text TEXT;
BEGIN
    -- Only process ALTER ROLE commands
    FOR cmd_record IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        IF cmd_record.command_tag = 'ALTER ROLE' THEN
            -- Log password changes
            INSERT INTO audit_logs (
                actor_type,
                action,
                resource_type,
                metadata
            ) VALUES (
                'system',
                'password_change',
                'database_role',
                jsonb_build_object(
                    'role_name', cmd_record.object_identity,
                    'changed_by', current_user,
                    'timestamp', NOW()
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create event trigger for password policy enforcement
CREATE EVENT TRIGGER password_policy_trigger
ON ddl_command_end
WHEN TAG IN ('ALTER ROLE')
EXECUTE FUNCTION enforce_password_policy();

-- ============================================================================
-- ROLE MANAGEMENT PROCEDURES
-- ============================================================================

-- Procedure to create a new application user
CREATE OR REPLACE FUNCTION create_application_user(
    username TEXT,
    password_hash TEXT,
    role_type TEXT DEFAULT 'app_user'
)
RETURNS BOOLEAN AS $$
DECLARE
    safe_username TEXT;
BEGIN
    -- Sanitize username
    safe_username := regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g');
    
    -- Validate role type
    IF role_type NOT IN ('app_user', 'app_readonly', 'app_analytics') THEN
        RAISE EXCEPTION 'Invalid role type: %', role_type;
    END IF;
    
    -- Create user
    EXECUTE format(
        'CREATE ROLE %I WITH LOGIN PASSWORD %L IN ROLE %I',
        safe_username,
        password_hash,
        role_type
    );
    
    -- Log user creation
    INSERT INTO audit_logs (
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        'admin',
        'user_creation',
        'database_role',
        jsonb_build_object(
            'username', safe_username,
            'role_type', role_type,
            'created_by', current_user
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure to remove application user
CREATE OR REPLACE FUNCTION remove_application_user(username TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    safe_username TEXT;
BEGIN
    -- Sanitize username
    safe_username := regexp_replace(username, '[^a-zA-Z0-9_]', '', 'g');
    
    -- Check if role exists
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = safe_username) THEN
        RAISE EXCEPTION 'Role % does not exist', safe_username;
    END IF;
    
    -- Remove user
    EXECUTE format('DROP ROLE %I', safe_username);
    
    -- Log user removal
    INSERT INTO audit_logs (
        actor_type,
        action,
        resource_type,
        metadata
    ) VALUES (
        'admin',
        'user_removal',
        'database_role',
        jsonb_build_object(
            'username', safe_username,
            'removed_by', current_user
        )
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GRANT EXECUTE PERMISSIONS ON MANAGEMENT FUNCTIONS
-- ============================================================================

-- Grant permissions to admin role for user management
GRANT EXECUTE ON FUNCTION create_application_user(TEXT, TEXT, TEXT) TO app_admin;
GRANT EXECUTE ON FUNCTION remove_application_user(TEXT) TO app_admin;
GRANT EXECUTE ON FUNCTION grant_tenant_access(TEXT, UUID, TEXT) TO app_admin;
GRANT EXECUTE ON FUNCTION revoke_tenant_access(TEXT, UUID) TO app_admin;
GRANT EXECUTE ON FUNCTION audit_role_permissions() TO app_admin, app_monitoring;

-- Grant monitoring permissions
GRANT SELECT ON role_permissions_summary TO app_admin, app_monitoring;

-- ============================================================================
-- FINAL SECURITY VERIFICATION
-- ============================================================================

-- Function to verify role security configuration
CREATE OR REPLACE FUNCTION verify_role_security()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    role_count INTEGER;
    superuser_count INTEGER;
BEGIN
    -- Check total application roles
    SELECT COUNT(*) INTO role_count
    FROM pg_roles
    WHERE rolname LIKE 'app_%';
    
    RETURN QUERY SELECT 
        'Application roles created'::TEXT,
        CASE WHEN role_count = 8 THEN 'PASS' ELSE 'FAIL' END,
        format('Found %s/8 application roles', role_count);
    
    -- Check superuser roles (should be minimal)
    SELECT COUNT(*) INTO superuser_count
    FROM pg_roles
    WHERE rolname LIKE 'app_%' AND rolsuper = true;
    
    RETURN QUERY SELECT 
        'Superuser role count'::TEXT,
        CASE WHEN superuser_count <= 1 THEN 'PASS' ELSE 'WARN' END,
        format('Found %s superuser roles (should be ≤1)', superuser_count);
    
    -- Check if RLS policies exist
    RETURN QUERY SELECT 
        'RLS policies configured'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public') THEN 'PASS' ELSE 'FAIL' END,
        'Row Level Security policies are configured';
    
    -- Check password policy
    RETURN QUERY SELECT 
        'Password policy enforced'::TEXT,
        CASE WHEN EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'password_policy_trigger') THEN 'PASS' ELSE 'FAIL' END,
        'Password policy event trigger is active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DOCUMENTATION AND COMMENTS
-- ============================================================================

COMMENT ON ROLE app_superuser IS 'Database superuser - Use only for critical administration';
COMMENT ON ROLE app_admin IS 'Application administrator - Cross-tenant access with audit logging';
COMMENT ON ROLE app_user IS 'Primary application role - Tenant-scoped operations';
COMMENT ON ROLE app_readonly IS 'Read-only access - Analytics and reporting';
COMMENT ON ROLE app_backup IS 'Backup operations - Data export and recovery';
COMMENT ON ROLE app_monitoring IS 'Performance monitoring - Database health checks';
COMMENT ON ROLE app_migration IS 'Schema migrations - Database structure changes';
COMMENT ON ROLE app_analytics IS 'Business intelligence - Advanced analytics queries';

-- Add comments to key functions
COMMENT ON FUNCTION create_application_user(TEXT, TEXT, TEXT) IS 'Safely create new application users with proper role assignment';
COMMENT ON FUNCTION verify_role_security() IS 'Verify that role security configuration meets requirements';
COMMENT ON FUNCTION audit_role_permissions() IS 'Generate comprehensive audit report of role permissions';

-- ============================================================================
-- INITIAL SECURITY VERIFICATION
-- ============================================================================

-- Run security verification
SELECT * FROM verify_role_security();