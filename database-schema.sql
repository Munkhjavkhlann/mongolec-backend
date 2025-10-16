-- Multi-Tenant Database Schema with Row Level Security (RLS)
-- PostgreSQL 15+ with UUID extensions

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================================
-- CORE TENANT MANAGEMENT
-- ============================================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(50) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9_-]+$'),
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255),
    subdomain VARCHAR(50),
    config JSONB DEFAULT '{}',
    theme_config JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 100,
    max_storage_mb INTEGER DEFAULT 5120, -- 5GB default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('basic', 'premium', 'enterprise'))
);

-- Sample tenant data
INSERT INTO tenants (slug, name, display_name, subdomain, config, features) VALUES
('site_a', 'Site A Organization', 'Site A', 'site-a', 
 '{"primary_color": "#3B82F6", "logo_url": "/logos/site-a.png"}',
 '{"news": true, "blogs": true, "programs": true, "events": false}'),
('site_b', 'Site B Corporation', 'Site B', 'site-b',
 '{"primary_color": "#10B981", "logo_url": "/logos/site-b.png"}',
 '{"news": true, "blogs": true, "programs": true, "events": true}'),
('site_c', 'Site C Foundation', 'Site C', 'site-c',
 '{"primary_color": "#F59E0B", "logo_url": "/logos/site-c.png"}',
 '{"news": true, "blogs": false, "programs": true, "events": true}');

-- ============================================================================
-- USER MANAGEMENT
-- ============================================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    profile JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_role CHECK (role IN ('user', 'editor', 'admin', 'super_admin')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'suspended')),
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- Global admin users (cross-tenant access)
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_admin_role CHECK (role IN ('admin', 'super_admin'))
);

-- ============================================================================
-- CONTENT MANAGEMENT
-- ============================================================================

-- Categories for organizing content
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_category_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Tags for content tagging
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_tag_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- News articles
CREATE TABLE news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    visibility VARCHAR(20) DEFAULT 'public',
    author_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    published_at TIMESTAMP WITH TIME ZONE,
    featured_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_news_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled')),
    CONSTRAINT valid_news_visibility CHECK (visibility IN ('public', 'private', 'members_only')),
    CONSTRAINT unique_news_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Blog posts
CREATE TABLE blogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT,
    featured_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    visibility VARCHAR(20) DEFAULT 'public',
    author_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    reading_time_minutes INTEGER,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_blog_status CHECK (status IN ('draft', 'published', 'archived', 'scheduled')),
    CONSTRAINT valid_blog_visibility CHECK (visibility IN ('public', 'private', 'members_only')),
    CONSTRAINT unique_blog_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- Programs/Courses
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) NOT NULL,
    description TEXT,
    detailed_description TEXT,
    featured_image_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'draft',
    visibility VARCHAR(20) DEFAULT 'public',
    program_type VARCHAR(50) DEFAULT 'course',
    difficulty_level VARCHAR(20) DEFAULT 'beginner',
    duration_hours INTEGER,
    price_amount DECIMAL(10,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    instructor_id UUID REFERENCES users(id),
    category_id UUID REFERENCES categories(id),
    enrollment_count INTEGER DEFAULT 0,
    max_enrollments INTEGER,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_program_status CHECK (status IN ('draft', 'published', 'archived', 'full')),
    CONSTRAINT valid_program_visibility CHECK (visibility IN ('public', 'private', 'members_only')),
    CONSTRAINT valid_program_type CHECK (program_type IN ('course', 'workshop', 'seminar', 'certification')),
    CONSTRAINT valid_difficulty_level CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT unique_program_slug_per_tenant UNIQUE (tenant_id, slug)
);

-- ============================================================================
-- CONTENT RELATIONSHIPS
-- ============================================================================

-- Content tags (many-to-many)
CREATE TABLE content_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_content_type CHECK (content_type IN ('news', 'blog', 'program')),
    CONSTRAINT unique_content_tag UNIQUE (content_type, content_id, tag_id)
);

-- Comments system
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id),
    author_id UUID REFERENCES users(id),
    author_name VARCHAR(255),
    author_email VARCHAR(255),
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_comment_content_type CHECK (content_type IN ('news', 'blog', 'program')),
    CONSTRAINT valid_comment_status CHECK (status IN ('pending', 'approved', 'rejected', 'spam'))
);

-- ============================================================================
-- FILE MANAGEMENT
-- ============================================================================

CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    original_name VARCHAR(500) NOT NULL,
    file_name VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    alt_text TEXT,
    caption TEXT,
    uploaded_by UUID REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_file_type CHECK (file_type IN ('image', 'document', 'video', 'audio', 'other'))
);

-- ============================================================================
-- ANALYTICS AND TRACKING
-- ============================================================================

CREATE TABLE page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    content_type VARCHAR(20),
    content_id UUID,
    url VARCHAR(1000) NOT NULL,
    referrer VARCHAR(1000),
    user_agent TEXT,
    ip_address INET,
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    country VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_view_content_type CHECK (content_type IN ('news', 'blog', 'program', 'page'))
);

-- ============================================================================
-- SYSTEM SETTINGS AND CONFIGURATION
-- ============================================================================

CREATE TABLE tenant_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(50) DEFAULT 'general',
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_setting_per_tenant UNIQUE (tenant_id, setting_key)
);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tenant-specific tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Tenant isolation policies
CREATE POLICY tenant_isolation_users ON users
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_categories ON categories
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_tags ON tags
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_news ON news
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_blogs ON blogs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_programs ON programs
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_comments ON comments
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_media_files ON media_files
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_page_views ON page_views
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tenant_isolation_tenant_settings ON tenant_settings
    USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Special policy for content_tags (needs to check through related content)
CREATE POLICY tenant_isolation_content_tags ON content_tags
    USING (
        (content_type = 'news' AND content_id IN (SELECT id FROM news WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID)) OR
        (content_type = 'blog' AND content_id IN (SELECT id FROM blogs WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID)) OR
        (content_type = 'program' AND content_id IN (SELECT id FROM programs WHERE tenant_id = current_setting('app.current_tenant_id', true)::UUID))
    );

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Tenant-based indexes
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email_tenant ON users(tenant_id, email);
CREATE INDEX idx_news_tenant_id ON news(tenant_id);
CREATE INDEX idx_news_tenant_status_published ON news(tenant_id, status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_blogs_tenant_id ON blogs(tenant_id);
CREATE INDEX idx_blogs_tenant_status_published ON blogs(tenant_id, status, published_at DESC) WHERE status = 'published';
CREATE INDEX idx_programs_tenant_id ON programs(tenant_id);
CREATE INDEX idx_programs_tenant_status ON programs(tenant_id, status);

-- Content relationship indexes
CREATE INDEX idx_content_tags_content ON content_tags(content_type, content_id);
CREATE INDEX idx_content_tags_tag ON content_tags(tag_id);
CREATE INDEX idx_comments_content ON comments(content_type, content_id);
CREATE INDEX idx_comments_status ON comments(tenant_id, status);

-- Search indexes
CREATE INDEX idx_news_title_search ON news USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));
CREATE INDEX idx_blogs_title_search ON blogs USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));
CREATE INDEX idx_programs_title_search ON programs USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Performance indexes
CREATE INDEX idx_page_views_tenant_created ON page_views(tenant_id, created_at DESC);
CREATE INDEX idx_media_files_tenant_type ON media_files(tenant_id, file_type);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update timestamps trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON news
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blogs_updated_at BEFORE UPDATE ON blogs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON programs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tag usage count trigger
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tag_usage_count_trigger
    AFTER INSERT OR DELETE ON content_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- ============================================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to set tenant context (used by application)
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_uuid::text, true);
END;
$$ LANGUAGE plpgsql;

-- Function to get tenant by slug
CREATE OR REPLACE FUNCTION get_tenant_by_slug(tenant_slug text)
RETURNS TABLE(
    id UUID,
    name VARCHAR(255),
    display_name VARCHAR(255),
    config JSONB,
    features JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.display_name, t.config, t.features
    FROM tenants t
    WHERE t.slug = tenant_slug AND t.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Function to generate content slug
CREATE OR REPLACE FUNCTION generate_content_slug(base_title text, tenant_uuid UUID, content_table text)
RETURNS text AS $$
DECLARE
    base_slug text;
    final_slug text;
    counter integer := 0;
    exists_count integer;
BEGIN
    -- Generate base slug
    base_slug := lower(regexp_replace(base_title, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    final_slug := base_slug;
    
    -- Check for uniqueness and increment if needed
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I WHERE tenant_id = $1 AND slug = $2', content_table)
        INTO exists_count
        USING tenant_uuid, final_slug;
        
        IF exists_count = 0 THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        final_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;