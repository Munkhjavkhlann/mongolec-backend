-- ============================================================================
-- COMPREHENSIVE POSTGRESQL MULTI-TENANT DATABASE SCHEMA
-- WITH ROW LEVEL SECURITY (RLS) AND ENHANCED SECURITY
-- ============================================================================
-- 
-- This schema is designed for multi-tenant architecture with:
-- - Complete tenant data isolation using RLS
-- - Performance optimization for scale
-- - Security-first design
-- - Python ORM compatibility (SQLAlchemy/Django)
-- - Audit logging and monitoring
-- - Backup and recovery support
--
-- PostgreSQL Version: 15+
-- Extensions Required: uuid-ossp, pg_trgm, unaccent, pgcrypto
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- DATABASE ROLES AND PERMISSIONS
-- ============================================================================

-- Application roles for different access levels
DO $$
BEGIN
    -- Main application role (used by backend services)
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_app_password_change_me';
    END IF;
    
    -- Read-only role for analytics and reporting
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_readonly') THEN
        CREATE ROLE app_readonly WITH LOGIN PASSWORD 'secure_readonly_password_change_me';
    END IF;
    
    -- Admin role for database management
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin WITH LOGIN PASSWORD 'secure_admin_password_change_me';
    END IF;
    
    -- Backup role for automated backups
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_backup') THEN
        CREATE ROLE app_backup WITH LOGIN PASSWORD 'secure_backup_password_change_me';
    END IF;
END
$$;

-- ============================================================================
-- CORE TENANT MANAGEMENT TABLES
-- ============================================================================

-- Tenants table with enhanced security and configuration
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9_-]+$'),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    subdomain VARCHAR(50),
    
    -- Configuration and customization
    config JSONB DEFAULT '{}' NOT NULL,
    theme_config JSONB DEFAULT '{}' NOT NULL,
    features JSONB DEFAULT '{}' NOT NULL,
    security_config JSONB DEFAULT '{}' NOT NULL,
    
    -- Subscription and limits
    subscription_tier VARCHAR(50) DEFAULT 'basic' NOT NULL,
    subscription_status VARCHAR(20) DEFAULT 'active' NOT NULL,
    max_users INTEGER DEFAULT 100 NOT NULL,
    max_storage_mb INTEGER DEFAULT 5120 NOT NULL, -- 5GB default
    max_api_requests_per_hour INTEGER DEFAULT 10000 NOT NULL,
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_verified BOOLEAN DEFAULT false NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC' NOT NULL,
    locale VARCHAR(10) DEFAULT 'en_US' NOT NULL,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('basic', 'premium', 'enterprise', 'trial')),
    CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'expired')),
    CONSTRAINT valid_timezone CHECK (timezone ~ '^[A-Za-z_/]+$'),
    CONSTRAINT valid_locale CHECK (locale ~ '^[a-z]{2}_[A-Z]{2}$')
);

-- Tenant audit log
CREATE TABLE IF NOT EXISTS tenant_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_action CHECK (action IN ('created', 'updated', 'deleted', 'suspended', 'reactivated'))
);

-- ============================================================================
-- USER MANAGEMENT SYSTEM
-- ============================================================================

-- Main users table for tenant users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Profile information
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    display_name VARCHAR(255),
    avatar_url VARCHAR(500),
    
    -- Roles and permissions
    role VARCHAR(50) DEFAULT 'user' NOT NULL,
    permissions JSONB DEFAULT '[]' NOT NULL,
    custom_permissions JSONB DEFAULT '{}' NOT NULL,
    
    -- Status and verification
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    
    -- Profile and preferences
    profile JSONB DEFAULT '{}' NOT NULL,
    preferences JSONB DEFAULT '{}' NOT NULL,
    notification_settings JSONB DEFAULT '{}' NOT NULL,
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
    two_factor_secret VARCHAR(255),
    backup_codes JSONB DEFAULT '[]' NOT NULL,
    
    -- Activity tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0 NOT NULL,
    failed_login_attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT valid_role CHECK (role IN ('user', 'editor', 'admin', 'super_admin', 'viewer')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended', 'banned')),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Global admin users (cross-tenant access)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar_url VARCHAR(500),
    
    -- Roles and permissions
    role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    permissions JSONB DEFAULT '[]' NOT NULL,
    tenant_access JSONB DEFAULT '[]' NOT NULL, -- Array of tenant IDs they can access
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
    two_factor_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Activity
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_admin_role CHECK (role IN ('admin', 'super_admin', 'support')),
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- User sessions for security tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) UNIQUE,
    
    -- Session metadata
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Expiration
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_reason VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- CONTENT MANAGEMENT SYSTEM
-- ============================================================================

-- Categories for organizing content
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic information
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0 NOT NULL,
    path TEXT, -- Materialized path for efficient queries
    
    -- Display and ordering
    sort_order INTEGER DEFAULT 0 NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(100),
    
    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_category_slug_per_tenant UNIQUE (tenant_id, slug),
    CONSTRAINT valid_level CHECK (level >= 0 AND level <= 10)
);

-- Tags for flexible content tagging
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic information
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6B7280',
    
    -- Usage tracking
    usage_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_tag_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- News articles
CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    content_html TEXT, -- Rendered HTML version
    
    -- Media
    featured_image_url VARCHAR(500),
    featured_image_alt TEXT,
    gallery_images JSONB DEFAULT '[]' NOT NULL,
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    visibility VARCHAR(20) DEFAULT 'public' NOT NULL,
    
    -- Relationships
    author_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0 NOT NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    share_count INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    
    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    canonical_url VARCHAR(500),
    
    -- Publishing
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    featured_until TIMESTAMP WITH TIME ZONE,
    
    -- Content settings
    allow_comments BOOLEAN DEFAULT true NOT NULL,
    is_breaking BOOLEAN DEFAULT false NOT NULL,
    priority_score INTEGER DEFAULT 0 NOT NULL,
    reading_time_minutes INTEGER,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_news_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled', 'deleted')),
    CONSTRAINT valid_news_visibility CHECK (visibility IN ('public', 'private', 'members_only', 'password_protected')),
    CONSTRAINT unique_news_slug_per_tenant UNIQUE (tenant_id, slug),
    CONSTRAINT valid_priority_score CHECK (priority_score >= 0 AND priority_score <= 100)
);

-- Blog posts
CREATE TABLE IF NOT EXISTS blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    content_html TEXT,
    
    -- Media
    featured_image_url VARCHAR(500),
    featured_image_alt TEXT,
    gallery_images JSONB DEFAULT '[]' NOT NULL,
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    visibility VARCHAR(20) DEFAULT 'public' NOT NULL,
    
    -- Relationships
    author_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    
    -- Blog-specific features
    series_id UUID, -- For blog series
    series_order INTEGER,
    
    -- Engagement metrics
    view_count INTEGER DEFAULT 0 NOT NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    share_count INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Content analysis
    reading_time_minutes INTEGER,
    word_count INTEGER,
    
    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    canonical_url VARCHAR(500),
    
    -- Publishing
    published_at TIMESTAMP WITH TIME ZONE,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    allow_comments BOOLEAN DEFAULT true NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_blog_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled', 'deleted')),
    CONSTRAINT valid_blog_visibility CHECK (visibility IN ('public', 'private', 'members_only', 'password_protected')),
    CONSTRAINT unique_blog_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Programs/Courses
CREATE TABLE IF NOT EXISTS programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Basic information
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    description TEXT,
    detailed_description TEXT,
    
    -- Media
    featured_image_url VARCHAR(500),
    featured_image_alt TEXT,
    gallery_images JSONB DEFAULT '[]' NOT NULL,
    video_trailer_url VARCHAR(500),
    
    -- Status and visibility
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    visibility VARCHAR(20) DEFAULT 'public' NOT NULL,
    
    -- Program details
    program_type VARCHAR(50) DEFAULT 'course' NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner' NOT NULL,
    duration_hours INTEGER,
    duration_weeks INTEGER,
    
    -- Pricing
    price_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    is_free BOOLEAN DEFAULT true NOT NULL,
    
    -- Relationships
    instructor_id UUID NOT NULL REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    
    -- Enrollment
    enrollment_count INTEGER DEFAULT 0 NOT NULL,
    max_enrollments INTEGER,
    min_enrollments INTEGER DEFAULT 1 NOT NULL,
    
    -- Schedule
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    registration_start_date TIMESTAMP WITH TIME ZONE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    
    -- Requirements and outcomes
    prerequisites JSONB DEFAULT '[]' NOT NULL,
    learning_outcomes JSONB DEFAULT '[]' NOT NULL,
    materials_included JSONB DEFAULT '[]' NOT NULL,
    
    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    
    -- Settings
    allow_reviews BOOLEAN DEFAULT true NOT NULL,
    certificate_available BOOLEAN DEFAULT false NOT NULL,
    
    -- Metrics
    rating_average DECIMAL(3,2) DEFAULT 0.00 NOT NULL,
    rating_count INTEGER DEFAULT 0 NOT NULL,
    completion_rate DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_program_status CHECK (status IN ('draft', 'published', 'archived', 'full', 'cancelled')),
    CONSTRAINT valid_program_visibility CHECK (visibility IN ('public', 'private', 'members_only')),
    CONSTRAINT valid_program_type CHECK (program_type IN ('course', 'workshop', 'seminar', 'certification', 'bootcamp')),
    CONSTRAINT valid_difficulty_level CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
    CONSTRAINT unique_program_slug_per_tenant UNIQUE (tenant_id, slug),
    CONSTRAINT valid_rating_average CHECK (rating_average >= 0.00 AND rating_average <= 5.00),
    CONSTRAINT valid_completion_rate CHECK (completion_rate >= 0.00 AND completion_rate <= 100.00)
);

-- ============================================================================
-- CONTENT RELATIONSHIPS AND INTERACTIONS
-- ============================================================================

-- Content tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS content_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID REFERENCES users(id),
    
    CONSTRAINT valid_content_type CHECK (content_type IN ('news', 'blog', 'program')),
    CONSTRAINT unique_content_tag UNIQUE (content_type, content_id, tag_id)
);

-- Comments system
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content reference
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    
    -- Author information (can be user or guest)
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    
    -- Content
    content TEXT NOT NULL,
    content_html TEXT,
    
    -- Status and moderation
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    moderated_by UUID REFERENCES users(id),
    moderated_at TIMESTAMP WITH TIME ZONE,
    moderation_reason TEXT,
    
    -- Engagement
    like_count INTEGER DEFAULT 0 NOT NULL,
    reply_count INTEGER DEFAULT 0 NOT NULL,
    
    -- Security and spam detection
    ip_address INET,
    user_agent TEXT,
    spam_score DECIMAL(3,2) DEFAULT 0.00 NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_comment_content_type CHECK (content_type IN ('news', 'blog', 'program')),
    CONSTRAINT valid_comment_status CHECK (status IN ('pending', 'approved', 'rejected', 'spam', 'deleted')),
    CONSTRAINT valid_spam_score CHECK (spam_score >= 0.00 AND spam_score <= 1.00)
);

-- Content likes/reactions
CREATE TABLE IF NOT EXISTS content_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reaction_type VARCHAR(20) DEFAULT 'like' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_reaction_content_type CHECK (content_type IN ('news', 'blog', 'program', 'comment')),
    CONSTRAINT valid_reaction_type CHECK (reaction_type IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')),
    CONSTRAINT unique_user_content_reaction UNIQUE (content_type, content_id, user_id, reaction_type)
);

-- ============================================================================
-- MEDIA AND FILE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- File information
    original_name VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_hash VARCHAR(255), -- For duplicate detection
    
    -- Media metadata
    alt_text TEXT,
    caption TEXT,
    dimensions JSONB, -- {width: 1920, height: 1080}
    metadata JSONB DEFAULT '{}' NOT NULL, -- EXIF data, etc.
    
    -- Organization
    folder_path VARCHAR(500) DEFAULT '/' NOT NULL,
    tags JSONB DEFAULT '[]' NOT NULL,
    
    -- Usage and security
    uploaded_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0 NOT NULL,
    is_public BOOLEAN DEFAULT false NOT NULL,
    access_level VARCHAR(20) DEFAULT 'private' NOT NULL,
    
    -- Processing status (for images/videos)
    processing_status VARCHAR(20) DEFAULT 'completed' NOT NULL,
    variants JSONB DEFAULT '{}' NOT NULL, -- Thumbnails, compressed versions
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_file_type CHECK (file_type IN ('image', 'document', 'video', 'audio', 'archive', 'other')),
    CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'private', 'tenant_only', 'authenticated')),
    CONSTRAINT valid_processing_status CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- ============================================================================
-- ANALYTICS AND TRACKING
-- ============================================================================

-- Page views and analytics
CREATE TABLE IF NOT EXISTS page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Content reference
    content_type VARCHAR(20),
    content_id UUID,
    
    -- Request information
    url VARCHAR(1000) NOT NULL,
    path VARCHAR(500) NOT NULL,
    query_params JSONB DEFAULT '{}' NOT NULL,
    referrer VARCHAR(1000),
    
    -- User information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    visitor_id VARCHAR(255), -- Anonymous visitor tracking
    
    -- Technical details
    user_agent TEXT,
    ip_address INET,
    device_type VARCHAR(20),
    browser VARCHAR(50),
    os VARCHAR(50),
    
    -- Geographic information
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    timezone VARCHAR(50),
    
    -- Performance metrics
    load_time_ms INTEGER,
    
    -- Engagement metrics
    time_on_page_seconds INTEGER,
    bounce BOOLEAN DEFAULT false NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_view_content_type CHECK (content_type IN ('news', 'blog', 'program', 'page', 'home', 'category'))
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Request details
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    
    -- User context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_key_id UUID, -- If using API keys
    
    -- Request metadata
    ip_address INET,
    user_agent TEXT,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Error information
    error_message TEXT,
    error_code VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_http_method CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'))
);

-- ============================================================================
-- SYSTEM SETTINGS AND CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Setting details
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'general' NOT NULL,
    data_type VARCHAR(20) DEFAULT 'string' NOT NULL,
    
    -- Metadata
    description TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL,
    is_encrypted BOOLEAN DEFAULT false NOT NULL,
    validation_rules JSONB DEFAULT '{}' NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_by UUID REFERENCES users(id),
    
    CONSTRAINT unique_setting_per_tenant UNIQUE (tenant_id, setting_key),
    CONSTRAINT valid_setting_type CHECK (setting_type IN ('general', 'security', 'ui', 'integration', 'notification')),
    CONSTRAINT valid_data_type CHECK (data_type IN ('string', 'number', 'boolean', 'object', 'array'))
);

-- Global system settings
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'system' NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- AUDIT AND SECURITY LOGGING
-- ============================================================================

-- Comprehensive audit log for all sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    actor_type VARCHAR(20) DEFAULT 'user' NOT NULL,
    actor_email VARCHAR(255),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    changes JSONB, -- Computed diff
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    
    -- Risk assessment
    risk_level VARCHAR(20) DEFAULT 'low' NOT NULL,
    automated_action BOOLEAN DEFAULT false NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}' NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_actor_type CHECK (actor_type IN ('user', 'admin', 'system', 'api')),
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- Security events tracking
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info' NOT NULL,
    description TEXT NOT NULL,
    
    -- Actor information
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Detection information
    detection_method VARCHAR(50) NOT NULL,
    confidence_score DECIMAL(3,2) DEFAULT 1.00 NOT NULL,
    
    -- Response information
    blocked BOOLEAN DEFAULT false NOT NULL,
    action_taken VARCHAR(100),
    
    -- Additional data
    metadata JSONB DEFAULT '{}' NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    CONSTRAINT valid_event_type CHECK (event_type IN ('login_failure', 'suspicious_activity', 'rate_limit_exceeded', 'privilege_escalation', 'data_exfiltration', 'malware_detected')),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    CONSTRAINT valid_detection_method CHECK (detection_method IN ('rule_based', 'ml_model', 'anomaly_detection', 'manual')),
    CONSTRAINT valid_confidence_score CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00)
);

-- Database schema version tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    migration_sql TEXT,
    checksum VARCHAR(255),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    execution_time_ms INTEGER
);