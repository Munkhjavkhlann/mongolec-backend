-- ============================================================================
-- COMPREHENSIVE SAMPLE DATA AND TEST SCENARIOS
-- FOR MULTI-TENANT POSTGRESQL DATABASE
-- ============================================================================
--
-- This file provides comprehensive sample data and test scenarios for:
-- - Multi-tenant data isolation testing
-- - Performance testing with realistic data volumes
-- - Security testing scenarios
-- - Feature testing across different tenant configurations
-- - Load testing data sets
-- - Edge case and boundary testing
--
-- Data Sets Included:
-- - 3 sample tenants with different configurations
-- - Realistic user hierarchies and roles
-- - Diverse content samples (news, blogs, programs)
-- - Complex relationships and interactions
-- - Security test scenarios
-- - Performance test data volumes
-- ============================================================================

-- ============================================================================
-- SETUP AND CONFIGURATION
-- ============================================================================

-- Set proper tenant context for data insertion
-- This ensures RLS policies are properly tested
CREATE OR REPLACE FUNCTION setup_test_environment()
RETURNS TEXT AS $$
BEGIN
    -- Clear any existing test data (be careful in production!)
    PERFORM clear_tenant_context();
    
    -- Enable bypass mode for initial data loading
    PERFORM set_config('app.bypass_rls', 'true', true);
    
    RETURN 'Test environment setup completed';
END;
$$ LANGUAGE plpgsql;

-- Execute setup
SELECT setup_test_environment();

-- ============================================================================
-- SAMPLE TENANT DATA
-- ============================================================================

-- Insert sample tenants with realistic configurations
INSERT INTO tenants (id, slug, name, display_name, subdomain, config, theme_config, features, security_config, subscription_tier, max_users, max_storage_mb) VALUES
-- Tenant 1: News Organization
('11111111-1111-1111-1111-111111111111', 'breaking_news', 'Breaking News Media', 'Breaking News', 'breaking-news', 
 '{"primary_color": "#E53E3E", "logo_url": "/logos/breaking-news.png", "contact_email": "contact@breakingnews.com", "timezone": "America/New_York"}',
 '{"theme": "news", "layout": "modern", "colors": {"primary": "#E53E3E", "secondary": "#2D3748", "accent": "#4299E1"}}',
 '{"news": true, "blogs": true, "programs": false, "comments": true, "reactions": true, "newsletters": true}',
 '{"two_factor_required": false, "password_policy": "standard", "session_timeout": 8}',
 'premium', 500, 20480),

-- Tenant 2: Educational Institution
('22222222-2222-2222-2222-222222222222', 'tech_university', 'Tech University', 'Tech University', 'tech-uni',
 '{"primary_color": "#3182CE", "logo_url": "/logos/tech-university.png", "contact_email": "info@techuni.edu", "timezone": "America/Los_Angeles"}',
 '{"theme": "education", "layout": "academic", "colors": {"primary": "#3182CE", "secondary": "#1A202C", "accent": "#38B2AC"}}',
 '{"news": true, "blogs": true, "programs": true, "comments": true, "reactions": true, "courses": true, "certifications": true}',
 '{"two_factor_required": true, "password_policy": "strict", "session_timeout": 4}',
 'enterprise', 2000, 51200),

-- Tenant 3: Health & Wellness Blog
('33333333-3333-3333-3333-333333333333', 'wellness_hub', 'Wellness Hub', 'Wellness Hub', 'wellness-hub',
 '{"primary_color": "#38A169", "logo_url": "/logos/wellness-hub.png", "contact_email": "hello@wellnesshub.com", "timezone": "Europe/London"}',
 '{"theme": "wellness", "layout": "blog", "colors": {"primary": "#38A169", "secondary": "#2D3748", "accent": "#ED8936"}}',
 '{"news": false, "blogs": true, "programs": true, "comments": true, "reactions": true, "health_tracking": true}',
 '{"two_factor_required": false, "password_policy": "standard", "session_timeout": 12}',
 'basic', 100, 10240);

-- ============================================================================
-- SAMPLE ADMIN USERS
-- ============================================================================

INSERT INTO admin_users (id, email, password_hash, password_salt, first_name, last_name, role, permissions, tenant_access) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@system.com', 
 crypt('AdminPassword123!', gen_salt('bf')), gen_salt('bf'),
 'System', 'Administrator', 'super_admin',
 '["user_management", "tenant_management", "system_configuration", "analytics"]',
 '["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222", "33333333-3333-3333-3333-333333333333"]'),

('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'support@system.com',
 crypt('SupportPassword123!', gen_salt('bf')), gen_salt('bf'),
 'Support', 'Agent', 'support',
 '["user_support", "content_moderation", "analytics_read"]',
 '["11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"]');

-- ============================================================================
-- SAMPLE USERS FOR EACH TENANT
-- ============================================================================

-- Breaking News Media Users
INSERT INTO users (id, tenant_id, email, password_hash, password_salt, first_name, last_name, role, status, profile, preferences, created_at) VALUES
-- Admins
('10000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'editor@breakingnews.com',
 crypt('EditorPass123!', gen_salt('bf')), gen_salt('bf'),
 'Sarah', 'Williams', 'admin', 'active',
 '{"bio": "Senior Editor with 10 years of experience", "department": "Editorial", "phone": "+1-555-0101"}',
 '{"notification_email": true, "notification_push": true, "theme": "dark"}',
 NOW() - INTERVAL '6 months'),

('10000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'chiefeditor@breakingnews.com',
 crypt('ChiefPass123!', gen_salt('bf')), gen_salt('bf'),
 'Michael', 'Johnson', 'super_admin', 'active',
 '{"bio": "Chief Editor overseeing all editorial content", "department": "Editorial", "phone": "+1-555-0102"}',
 '{"notification_email": true, "notification_push": true, "theme": "light"}',
 NOW() - INTERVAL '2 years'),

-- Editors
('10000001-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'reporter1@breakingnews.com',
 crypt('Reporter123!', gen_salt('bf')), gen_salt('bf'),
 'Emily', 'Chen', 'editor', 'active',
 '{"bio": "Investigative reporter specializing in politics", "department": "News", "phone": "+1-555-0103"}',
 '{"notification_email": true, "notification_push": false, "theme": "light"}',
 NOW() - INTERVAL '1 year'),

('10000001-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'reporter2@breakingnews.com',
 crypt('Reporter123!', gen_salt('bf')), gen_salt('bf'),
 'David', 'Brown', 'editor', 'active',
 '{"bio": "Sports reporter covering major leagues", "department": "Sports", "phone": "+1-555-0104"}',
 '{"notification_email": true, "notification_push": true, "theme": "dark"}',
 NOW() - INTERVAL '8 months'),

-- Regular users/subscribers
('10000001-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'subscriber1@email.com',
 crypt('Subscriber123!', gen_salt('bf')), gen_salt('bf'),
 'Jennifer', 'Davis', 'user', 'active',
 '{"bio": "Regular reader interested in politics and technology", "interests": ["politics", "technology"]}',
 '{"notification_email": true, "notification_push": false}',
 NOW() - INTERVAL '3 months'),

('10000001-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'subscriber2@email.com',
 crypt('Subscriber123!', gen_salt('bf')), gen_salt('bf'),
 'Robert', 'Wilson', 'user', 'active',
 '{"bio": "Business professional following market news", "interests": ["business", "finance"]}',
 '{"notification_email": false, "notification_push": true}',
 NOW() - INTERVAL '1 month');

-- Tech University Users
INSERT INTO users (id, tenant_id, email, password_hash, password_salt, first_name, last_name, role, status, profile, preferences, created_at) VALUES
-- Admins
('20000001-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'admin@techuni.edu',
 crypt('UniAdmin123!', gen_salt('bf')), gen_salt('bf'),
 'Dr. Maria', 'Rodriguez', 'admin', 'active',
 '{"bio": "Dean of Computer Science", "department": "Computer Science", "office": "CS-301", "phone": "+1-555-1001"}',
 '{"notification_email": true, "notification_push": true, "theme": "light"}',
 NOW() - INTERVAL '3 years'),

-- Professors/Instructors
('20000001-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'prof.smith@techuni.edu',
 crypt('ProfPass123!', gen_salt('bf')), gen_salt('bf'),
 'Dr. John', 'Smith', 'editor', 'active',
 '{"bio": "Professor of Database Systems", "department": "Computer Science", "office": "CS-205", "phone": "+1-555-1002"}',
 '{"notification_email": true, "notification_push": false, "theme": "light"}',
 NOW() - INTERVAL '5 years'),

('20000001-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'prof.taylor@techuni.edu',
 crypt('ProfPass123!', gen_salt('bf')), gen_salt('bf'),
 'Dr. Lisa', 'Taylor', 'editor', 'active',
 '{"bio": "Professor of Machine Learning", "department": "Computer Science", "office": "CS-210", "phone": "+1-555-1003"}',
 '{"notification_email": true, "notification_push": true, "theme": "dark"}',
 NOW() - INTERVAL '2 years'),

-- Students
('20000001-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'alice.student@techuni.edu',
 crypt('Student123!', gen_salt('bf')), gen_salt('bf'),
 'Alice', 'Cooper', 'user', 'active',
 '{"bio": "Computer Science major, junior year", "student_id": "CS2022001", "year": "junior"}',
 '{"notification_email": true, "notification_push": true}',
 NOW() - INTERVAL '2 years'),

('20000001-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'bob.student@techuni.edu',
 crypt('Student123!', gen_salt('bf')), gen_salt('bf'),
 'Bob', 'Anderson', 'user', 'active',
 '{"bio": "Data Science major, senior year", "student_id": "DS2021015", "year": "senior"}',
 '{"notification_email": false, "notification_push": true}',
 NOW() - INTERVAL '3 years');

-- Wellness Hub Users
INSERT INTO users (id, tenant_id, email, password_hash, password_salt, first_name, last_name, role, status, profile, preferences, created_at) VALUES
-- Admin/Founder
('30000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'founder@wellnesshub.com',
 crypt('WellnessPass123!', gen_salt('bf')), gen_salt('bf'),
 'Dr. Emma', 'Green', 'admin', 'active',
 '{"bio": "Certified nutritionist and wellness coach", "credentials": ["PhD Nutrition", "Certified Wellness Coach"], "phone": "+44-20-7946-0001"}',
 '{"notification_email": true, "notification_push": true, "theme": "light"}',
 NOW() - INTERVAL '1 year'),

-- Content creators
('30000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'writer@wellnesshub.com',
 crypt('WriterPass123!', gen_salt('bf')), gen_salt('bf'),
 'James', 'Miller', 'editor', 'active',
 '{"bio": "Health and wellness writer", "specialties": ["fitness", "mental health"], "phone": "+44-20-7946-0002"}',
 '{"notification_email": true, "notification_push": false, "theme": "light"}',
 NOW() - INTERVAL '8 months'),

-- Community members
('30000001-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'member1@wellnesshub.com',
 crypt('Member123!', gen_salt('bf')), gen_salt('bf'),
 'Sophie', 'Turner', 'user', 'active',
 '{"bio": "Fitness enthusiast and yoga instructor", "interests": ["yoga", "nutrition", "mindfulness"]}',
 '{"notification_email": true, "notification_push": true}',
 NOW() - INTERVAL '4 months'),

('30000001-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 'member2@wellnesshub.com',
 crypt('Member123!', gen_salt('bf')), gen_salt('bf'),
 'Alex', 'Thompson', 'user', 'active',
 '{"bio": "Marathon runner interested in sports nutrition", "interests": ["running", "nutrition", "recovery"]}',
 '{"notification_email": false, "notification_push": true}',
 NOW() - INTERVAL '2 months');

-- ============================================================================
-- SAMPLE CATEGORIES
-- ============================================================================

-- Breaking News Categories
INSERT INTO categories (id, tenant_id, name, slug, description, parent_id, sort_order, color, created_by) VALUES
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Politics', 'politics', 'Political news and analysis', NULL, 1, '#E53E3E', '10000001-0000-0000-0000-000000000001'),
('c1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Technology', 'technology', 'Latest in tech and innovation', NULL, 2, '#3182CE', '10000001-0000-0000-0000-000000000001'),
('c1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Sports', 'sports', 'Sports news and updates', NULL, 3, '#38A169', '10000001-0000-0000-0000-000000000001'),
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Business', 'business', 'Business and financial news', NULL, 4, '#D69E2E', '10000001-0000-0000-0000-000000000001');

-- Tech University Categories
INSERT INTO categories (id, tenant_id, name, slug, description, parent_id, sort_order, color, created_by) VALUES
('c2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Computer Science', 'computer-science', 'Computer Science courses and resources', NULL, 1, '#3182CE', '20000001-0000-0000-0000-000000000001'),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Data Science', 'data-science', 'Data Science and Analytics', NULL, 2, '#805AD5', '20000001-0000-0000-0000-000000000001'),
('c2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Programming', 'programming', 'Programming tutorials and guides', 'c2222222-2222-2222-2222-222222222221', 1, '#4299E1', '20000001-0000-0000-0000-000000000002'),
('c2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Databases', 'databases', 'Database design and management', 'c2222222-2222-2222-2222-222222222221', 2, '#48BB78', '20000001-0000-0000-0000-000000000002');

-- Wellness Hub Categories
INSERT INTO categories (id, tenant_id, name, slug, description, parent_id, sort_order, color, created_by) VALUES
('c3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Nutrition', 'nutrition', 'Healthy eating and nutrition tips', NULL, 1, '#38A169', '30000001-0000-0000-0000-000000000001'),
('c3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Fitness', 'fitness', 'Exercise and fitness routines', NULL, 2, '#E53E3E', '30000001-0000-0000-0000-000000000001'),
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Mental Health', 'mental-health', 'Mental wellness and mindfulness', NULL, 3, '#805AD5', '30000001-0000-0000-0000-000000000001'),
('c3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Recipes', 'recipes', 'Healthy recipes and meal plans', 'c3333333-3333-3333-3333-333333333331', 1, '#D69E2E', '30000001-0000-0000-0000-000000000002');

-- ============================================================================
-- SAMPLE TAGS
-- ============================================================================

-- Breaking News Tags
INSERT INTO tags (id, tenant_id, name, slug, color, created_by) VALUES
('t1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Breaking', 'breaking', '#E53E3E', '10000001-0000-0000-0000-000000000001'),
('t1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Election', 'election', '#805AD5', '10000001-0000-0000-0000-000000000001'),
('t1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'AI', 'ai', '#3182CE', '10000001-0000-0000-0000-000000000001'),
('t1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Startup', 'startup', '#38A169', '10000001-0000-0000-0000-000000000001'),
('t1111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Championship', 'championship', '#D69E2E', '10000001-0000-0000-0000-000000000003');

-- Tech University Tags
INSERT INTO tags (id, tenant_id, name, slug, color, created_by) VALUES
('t2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Python', 'python', '#3182CE', '20000001-0000-0000-0000-000000000002'),
('t2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Machine Learning', 'machine-learning', '#805AD5', '20000001-0000-0000-0000-000000000003'),
('t2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'PostgreSQL', 'postgresql', '#48BB78', '20000001-0000-0000-0000-000000000002'),
('t2222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Beginner', 'beginner', '#4299E1', '20000001-0000-0000-0000-000000000001'),
('t2222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'Advanced', 'advanced', '#E53E3E', '20000001-0000-0000-0000-000000000001');

-- Wellness Hub Tags
INSERT INTO tags (id, tenant_id, name, slug, color, created_by) VALUES
('t3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Vegan', 'vegan', '#38A169', '30000001-0000-0000-0000-000000000001'),
('t3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Yoga', 'yoga', '#805AD5', '30000001-0000-0000-0000-000000000001'),
('t3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Meditation', 'meditation', '#4299E1', '30000001-0000-0000-0000-000000000001'),
('t3333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Weight Loss', 'weight-loss', '#E53E3E', '30000001-0000-0000-0000-000000000002'),
('t3333333-3333-3333-3333-333333333335', '33333333-3333-3333-3333-333333333333', 'Supplements', 'supplements', '#D69E2E', '30000001-0000-0000-0000-000000000001');

-- ============================================================================
-- SAMPLE NEWS ARTICLES
-- ============================================================================

-- Breaking News Articles
INSERT INTO news (id, tenant_id, title, slug, excerpt, content, status, visibility, author_id, category_id, view_count, like_count, published_at, is_breaking, reading_time_minutes, created_by) VALUES
('n1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
 'Major Technology Breakthrough in AI Development',
 'major-technology-breakthrough-ai-development',
 'Scientists announce groundbreaking advancement in artificial intelligence that could revolutionize multiple industries.',
 'In a landmark achievement, researchers at leading technology institutions have announced a significant breakthrough in artificial intelligence development. The new algorithm demonstrates unprecedented capabilities in natural language processing and complex problem-solving tasks. Early tests show performance improvements of over 300% compared to current state-of-the-art systems. Industry experts believe this advancement could accelerate AI adoption across healthcare, education, and business sectors. The research team plans to publish their findings in next month''s International Journal of Artificial Intelligence.',
 'published', 'public', '10000001-0000-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111112',
 1247, 89, NOW() - INTERVAL '2 hours', true, 4, '10000001-0000-0000-0000-000000000003'),

('n1111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111',
 'Election Results: Key Swing States Determine Outcome',
 'election-results-key-swing-states-outcome',
 'Final tallies from crucial swing states reveal decisive victory in closely watched congressional race.',
 'After a night of intense vote counting, election officials have declared winners in several key congressional races. The results from Pennsylvania, Michigan, and Wisconsin proved decisive in determining the balance of power. Voter turnout reached record levels, with over 75% participation in many districts. Campaign strategists point to suburban voter shifts as a crucial factor in the outcomes. Local officials praised the smooth operation of polling sites despite earlier concerns about potential disruptions.',
 'published', 'public', '10000001-0000-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111111',
 2156, 142, NOW() - INTERVAL '6 hours', true, 3, '10000001-0000-0000-0000-000000000003'),

('n1111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111',
 'Championship Finals Set After Thrilling Semifinals',
 'championship-finals-set-thrilling-semifinals',
 'Two powerhouse teams advance to championship game after dramatic comeback victories.',
 'Sports fans witnessed incredible drama as both semifinal games featured stunning comeback victories. The Eastern Conference champions overcame a 21-point deficit in the final quarter, while the Western champions won in overtime after trailing by 15 points at halftime. Star player performances dominated the headlines, with record-breaking individual statistics. Tickets for the championship game are selling for premium prices, with some reaching over $5,000. The final game is scheduled for next Sunday at a neutral venue.',
 'published', 'public', '10000001-0000-0000-0000-000000000004', 'c1111111-1111-1111-1111-111111111113',
 891, 67, NOW() - INTERVAL '1 day', false, 2, '10000001-0000-0000-0000-000000000004'),

('n1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111',
 'Tech Startup Raises $100M in Series B Funding',
 'tech-startup-raises-100m-series-b-funding',
 'Innovative fintech company secures major investment round to expand operations globally.',
 'A promising financial technology startup announced the completion of a $100 million Series B funding round, led by prominent venture capital firms. The company plans to use the investment to expand internationally and develop new AI-powered financial products. The startup has grown from 50 to 200 employees this year and processes over $1 billion in transactions monthly. Industry analysts view this funding as validation of the emerging fintech sector''s potential.',
 'published', 'public', '10000001-0000-0000-0000-000000000003', 'c1111111-1111-1111-1111-111111111114',
 543, 34, NOW() - INTERVAL '1 day', false, 3, '10000001-0000-0000-0000-000000000003');

-- ============================================================================
-- SAMPLE BLOG POSTS
-- ============================================================================

-- Tech University Blogs
INSERT INTO blogs (id, tenant_id, title, slug, excerpt, content, status, visibility, author_id, category_id, view_count, like_count, published_at, reading_time_minutes, word_count, created_by) VALUES
('b2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222',
 'Getting Started with PostgreSQL: A Comprehensive Guide',
 'getting-started-postgresql-comprehensive-guide',
 'Learn the fundamentals of PostgreSQL database management with practical examples and best practices.',
 'PostgreSQL is one of the most powerful and feature-rich open-source relational database systems available today. This comprehensive guide will walk you through the essential concepts and practical skills needed to work effectively with PostgreSQL. We''ll cover installation, basic SQL operations, advanced features like JSON support, and performance optimization techniques. Whether you''re a computer science student or a working professional, this guide provides the foundation you need to master PostgreSQL database management.',
 'published', 'public', '20000001-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222224',
 432, 28, NOW() - INTERVAL '3 days', 8, 1200, '20000001-0000-0000-0000-000000000002'),

('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'Machine Learning Fundamentals: From Theory to Practice',
 'machine-learning-fundamentals-theory-practice',
 'Explore core machine learning concepts with hands-on Python examples and real-world applications.',
 'Machine learning has revolutionized how we approach complex problems across various domains. This post introduces fundamental concepts including supervised and unsupervised learning, feature engineering, and model evaluation. We''ll work through practical examples using Python and popular libraries like scikit-learn and pandas. The content is designed for students with basic programming knowledge who want to understand both the theoretical foundations and practical applications of machine learning algorithms.',
 'published', 'public', '20000001-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222',
 678, 45, NOW() - INTERVAL '5 days', 12, 1800, '20000001-0000-0000-0000-000000000003'),

('b2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222',
 'Best Practices for Writing Clean, Maintainable Code',
 'best-practices-writing-clean-maintainable-code',
 'Essential coding principles and techniques that every developer should know for long-term project success.',
 'Writing clean, maintainable code is crucial for successful software development projects. This guide covers essential principles including proper naming conventions, function design, code organization, and documentation practices. We''ll explore concepts like SOLID principles, design patterns, and refactoring techniques. Real examples demonstrate how these practices improve code readability, reduce bugs, and facilitate team collaboration. These skills are essential for any programmer working on professional development projects.',
 'published', 'public', '20000001-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222223',
 345, 19, NOW() - INTERVAL '1 week', 6, 900, '20000001-0000-0000-0000-000000000002');

-- Wellness Hub Blogs
INSERT INTO blogs (id, tenant_id, title, slug, excerpt, content, status, visibility, author_id, category_id, view_count, like_count, published_at, reading_time_minutes, word_count, created_by) VALUES
('b3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333',
 'The Science of Mindful Eating: Transform Your Relationship with Food',
 'science-mindful-eating-transform-relationship-food',
 'Discover how mindful eating practices can improve digestion, satisfaction, and overall well-being.',
 'Mindful eating is more than just a wellness trend—it''s a scientifically-backed approach to nutrition that can transform your relationship with food. Research shows that practicing mindful eating can improve digestion, increase meal satisfaction, and support healthy weight management. This comprehensive guide explores the neuroscience behind mindful eating, practical techniques for implementation, and real-world strategies for busy lifestyles. Learn how to reconnect with your body''s hunger and fullness cues while developing a more positive relationship with food.',
 'published', 'public', '30000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333331',
 892, 67, NOW() - INTERVAL '2 days', 7, 1050, '30000001-0000-0000-0000-000000000001'),

('b3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333',
 '10-Minute Morning Yoga Routine for Energy and Focus',
 '10-minute-morning-yoga-routine-energy-focus',
 'Start your day with this energizing yoga sequence designed to improve flexibility and mental clarity.',
 'Beginning your day with yoga can set a positive tone and provide sustained energy throughout the morning. This 10-minute routine combines gentle stretches, breathing exercises, and mindfulness practices to awaken your body and mind. The sequence is suitable for all levels and requires no special equipment. Each pose is carefully selected to increase circulation, improve flexibility, and enhance mental focus. Regular practice of this routine can lead to improved posture, reduced stress, and greater overall well-being.',
 'published', 'public', '30000001-0000-0000-0000-000000000002', 'c3333333-3333-3333-3333-333333333332',
 1234, 89, NOW() - INTERVAL '4 days', 5, 750, '30000001-0000-0000-0000-000000000002'),

('b3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
 'Plant-Based Protein: Complete Guide to Vegan Nutrition',
 'plant-based-protein-complete-guide-vegan-nutrition',
 'Everything you need to know about getting adequate protein on a plant-based diet.',
 'One of the most common concerns about plant-based eating is protein intake. This comprehensive guide addresses these concerns with science-based information about plant protein sources, amino acid profiles, and meal planning strategies. We''ll explore protein-rich foods like legumes, nuts, seeds, and grains, plus provide practical tips for meeting daily protein requirements. The guide includes sample meal plans, recipes, and shopping lists to help you confidently maintain a nutritionally complete plant-based diet.',
 'published', 'public', '30000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333331',
 567, 42, NOW() - INTERVAL '6 days', 9, 1350, '30000001-0000-0000-0000-000000000001');

-- ============================================================================
-- SAMPLE PROGRAMS
-- ============================================================================

-- Tech University Programs
INSERT INTO programs (id, tenant_id, title, slug, description, detailed_description, status, visibility, program_type, difficulty_level, duration_hours, price_amount, is_free, instructor_id, category_id, start_date, end_date, registration_deadline, created_by) VALUES
('p2222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222',
 'Advanced Database Systems', 'advanced-database-systems',
 'Comprehensive course covering advanced database concepts, design patterns, and optimization techniques.',
 'This advanced course explores sophisticated database concepts including query optimization, transaction management, distributed systems, and NoSQL databases. Students will work with real-world datasets and learn industry best practices for database design and performance tuning. The curriculum covers both theoretical foundations and practical skills needed for modern database administration and development roles.',
 'published', 'public', 'course', 'advanced', 48, 0.00, true,
 '20000001-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222224',
 NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '16 weeks', NOW() + INTERVAL '1 week',
 '20000001-0000-0000-0000-000000000002'),

('p2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
 'Machine Learning Bootcamp', 'machine-learning-bootcamp',
 'Intensive 12-week program covering machine learning algorithms, tools, and real-world applications.',
 'This comprehensive bootcamp provides hands-on experience with machine learning algorithms and tools. Students will learn supervised and unsupervised learning techniques, deep learning fundamentals, and practical implementation using Python and popular ML libraries. The program includes project-based learning with real datasets and industry mentorship opportunities.',
 'published', 'public', 'bootcamp', 'intermediate', 144, 0.00, true,
 '20000001-0000-0000-0000-000000000003', 'c2222222-2222-2222-2222-222222222222',
 NOW() + INTERVAL '1 month', NOW() + INTERVAL '4 months', NOW() + INTERVAL '3 weeks',
 '20000001-0000-0000-0000-000000000003'),

('p2222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222',
 'Python Programming Fundamentals', 'python-programming-fundamentals',
 'Introduction to Python programming for beginners with no prior coding experience.',
 'This beginner-friendly course introduces Python programming concepts through interactive exercises and projects. Students will learn variables, control structures, functions, and object-oriented programming. The course emphasizes practical problem-solving and includes projects in data analysis, web development, and automation.',
 'published', 'public', 'course', 'beginner', 32, 0.00, true,
 '20000001-0000-0000-0000-000000000002', 'c2222222-2222-2222-2222-222222222223',
 NOW() + INTERVAL '1 week', NOW() + INTERVAL '9 weeks', NOW() + INTERVAL '3 days',
 '20000001-0000-0000-0000-000000000002');

-- Wellness Hub Programs
INSERT INTO programs (id, tenant_id, title, slug, description, detailed_description, status, visibility, program_type, difficulty_level, duration_hours, price_amount, is_free, instructor_id, category_id, start_date, end_date, registration_deadline, created_by) VALUES
('p3333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333',
 'Mindfulness Meditation Workshop', 'mindfulness-meditation-workshop',
 '8-week program teaching fundamental mindfulness and meditation techniques for stress reduction.',
 'This comprehensive workshop introduces participants to evidence-based mindfulness practices for stress reduction and emotional well-being. Each session combines guided meditation, breathing exercises, and mindful movement. Participants learn practical techniques they can integrate into daily life for improved focus, reduced anxiety, and greater emotional resilience.',
 'published', 'public', 'workshop', 'beginner', 16, 149.00, false,
 '30000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333333',
 NOW() + INTERVAL '2 weeks', NOW() + INTERVAL '10 weeks', NOW() + INTERVAL '1 week',
 '30000001-0000-0000-0000-000000000001'),

('p3333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333',
 'Nutrition Certification Program', 'nutrition-certification-program',
 'Professional certification in holistic nutrition and wellness coaching.',
 'This comprehensive certification program prepares participants to become certified nutrition consultants. The curriculum covers nutritional science, meal planning, supplement guidance, and client coaching techniques. Graduates receive a recognized certification and ongoing support for building a nutrition consulting practice.',
 'published', 'public', 'certification', 'intermediate', 120, 1299.00, false,
 '30000001-0000-0000-0000-000000000001', 'c3333333-3333-3333-3333-333333333331',
 NOW() + INTERVAL '1 month', NOW() + INTERVAL '7 months', NOW() + INTERVAL '3 weeks',
 '30000001-0000-0000-0000-000000000001'),

('p3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
 'Beginner Yoga Series', 'beginner-yoga-series',
 '6-week introduction to yoga with focus on basic poses, breathing, and relaxation.',
 'Perfect for yoga newcomers, this series covers fundamental poses, proper breathing techniques, and relaxation methods. Each session builds progressively to develop strength, flexibility, and mindfulness. Small class sizes ensure personalized attention and safe practice development.',
 'published', 'public', 'course', 'beginner', 12, 89.00, false,
 '30000001-0000-0000-0000-000000000002', 'c3333333-3333-3333-3333-333333333332',
 NOW() + INTERVAL '1 week', NOW() + INTERVAL '7 weeks', NOW() + INTERVAL '3 days',
 '30000001-0000-0000-0000-000000000002');

-- ============================================================================
-- CONTENT RELATIONSHIPS
-- ============================================================================

-- News article tags
INSERT INTO content_tags (content_type, content_id, tag_id, created_by) VALUES
('news', 'n1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111113', '10000001-0000-0000-0000-000000000003'),
('news', 'n1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', '10000001-0000-0000-0000-000000000003'),
('news', 'n1111111-1111-1111-1111-111111111112', 't1111111-1111-1111-1111-111111111112', '10000001-0000-0000-0000-000000000003'),
('news', 'n1111111-1111-1111-1111-111111111112', 't1111111-1111-1111-1111-111111111111', '10000001-0000-0000-0000-000000000003'),
('news', 'n1111111-1111-1111-1111-111111111114', 't1111111-1111-1111-1111-111111111114', '10000001-0000-0000-0000-000000000003');

-- Blog post tags
INSERT INTO content_tags (content_type, content_id, tag_id, created_by) VALUES
('blog', 'b2222222-2222-2222-2222-222222222221', 't2222222-2222-2222-2222-222222222223', '20000001-0000-0000-0000-000000000002'),
('blog', 'b2222222-2222-2222-2222-222222222221', 't2222222-2222-2222-2222-222222222224', '20000001-0000-0000-0000-000000000002'),
('blog', 'b2222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222222', '20000001-0000-0000-0000-000000000003'),
('blog', 'b2222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222221', '20000001-0000-0000-0000-000000000003'),
('blog', 'b3333333-3333-3333-3333-333333333331', 't3333333-3333-3333-3333-333333333333', '30000001-0000-0000-0000-000000000001'),
('blog', 'b3333333-3333-3333-3333-333333333332', 't3333333-3333-3333-3333-333333333332', '30000001-0000-0000-0000-000000000002'),
('blog', 'b3333333-3333-3333-3333-333333333333', 't3333333-3333-3333-3333-333333333331', '30000001-0000-0000-0000-000000000001');

-- Program tags
INSERT INTO content_tags (content_type, content_id, tag_id, created_by) VALUES
('program', 'p2222222-2222-2222-2222-222222222221', 't2222222-2222-2222-2222-222222222223', '20000001-0000-0000-0000-000000000002'),
('program', 'p2222222-2222-2222-2222-222222222221', 't2222222-2222-2222-2222-222222222225', '20000001-0000-0000-0000-000000000002'),
('program', 'p2222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222222', '20000001-0000-0000-0000-000000000003'),
('program', 'p2222222-2222-2222-2222-222222222223', 't2222222-2222-2222-2222-222222222221', '20000001-0000-0000-0000-000000000002'),
('program', 'p2222222-2222-2222-2222-222222222223', 't2222222-2222-2222-2222-222222222224', '20000001-0000-0000-0000-000000000002'),
('program', 'p3333333-3333-3333-3333-333333333331', 't3333333-3333-3333-3333-333333333333', '30000001-0000-0000-0000-000000000001'),
('program', 'p3333333-3333-3333-3333-333333333332', 't3333333-3333-3333-3333-333333333331', '30000001-0000-0000-0000-000000000001'),
('program', 'p3333333-3333-3333-3333-333333333333', 't3333333-3333-3333-3333-333333333332', '30000001-0000-0000-0000-000000000002');

-- ============================================================================
-- SAMPLE COMMENTS
-- ============================================================================

-- Comments on news articles
INSERT INTO comments (id, tenant_id, content_type, content_id, author_id, author_name, author_email, content, status, created_at) VALUES
('cm111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'news', 'n1111111-1111-1111-1111-111111111111',
 '10000001-0000-0000-0000-000000000005', 'Jennifer Davis', 'subscriber1@email.com',
 'This is a fascinating development! Can''t wait to see how this technology is implemented in practice.',
 'approved', NOW() - INTERVAL '1 hour'),

('cm111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'news', 'n1111111-1111-1111-1111-111111111111',
 '10000001-0000-0000-0000-000000000006', 'Robert Wilson', 'subscriber2@email.com',
 'Great reporting! Would love to see a follow-up article on the business implications.',
 'approved', NOW() - INTERVAL '45 minutes'),

('cm111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'news', 'n1111111-1111-1111-1111-111111111112',
 NULL, 'Anonymous Reader', 'guest@email.com',
 'The voter turnout numbers are impressive. Shows people are really engaged with the process.',
 'approved', NOW() - INTERVAL '3 hours');

-- Comments on blog posts
INSERT INTO comments (id, tenant_id, content_type, content_id, author_id, author_name, author_email, content, status, created_at) VALUES
('cm222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'blog', 'b2222222-2222-2222-2222-222222222221',
 '20000001-0000-0000-0000-000000000004', 'Alice Cooper', 'alice.student@techuni.edu',
 'This guide was incredibly helpful for my database project. Thank you, Professor Smith!',
 'approved', NOW() - INTERVAL '2 days'),

('cm222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'blog', 'b2222222-2222-2222-2222-222222222222',
 '20000001-0000-0000-0000-000000000005', 'Bob Anderson', 'bob.student@techuni.edu',
 'Great introduction to ML concepts. Looking forward to the advanced topics in the next post.',
 'approved', NOW() - INTERVAL '4 days'),

('cm333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'blog', 'b3333333-3333-3333-3333-333333333331',
 '30000001-0000-0000-0000-000000000003', 'Sophie Turner', 'member1@wellnesshub.com',
 'I''ve been practicing mindful eating for a week now and already notice a difference in how I feel after meals.',
 'approved', NOW() - INTERVAL '1 day');

-- ============================================================================
-- SAMPLE ANALYTICS DATA
-- ============================================================================

-- Generate realistic page view data
INSERT INTO page_views (tenant_id, content_type, content_id, url, path, user_id, ip_address, device_type, browser, country, created_at)
SELECT 
    tenant_id,
    'news' as content_type,
    id as content_id,
    '/news/' || slug as url,
    '/news/' || slug as path,
    CASE WHEN random() > 0.5 THEN 
        (SELECT u.id FROM users u WHERE u.tenant_id = news.tenant_id ORDER BY random() LIMIT 1)
    ELSE NULL END as user_id,
    ('192.168.' || floor(random() * 255)::int || '.' || floor(random() * 255)::int)::inet as ip_address,
    (ARRAY['desktop', 'mobile', 'tablet'])[floor(random() * 3 + 1)] as device_type,
    (ARRAY['Chrome', 'Firefox', 'Safari', 'Edge'])[floor(random() * 4 + 1)] as browser,
    (ARRAY['US', 'CA', 'GB', 'AU'])[floor(random() * 4 + 1)] as country,
    created_at + (random() * interval '30 days') as created_at
FROM news
CROSS JOIN generate_series(1, 50) -- Generate 50 page views per news article
WHERE status = 'published';

-- Generate sample performance metrics
INSERT INTO performance_metrics (tenant_id, metric_type, metric_name, metric_value, metric_unit, collected_at)
SELECT 
    t.id as tenant_id,
    'query_performance' as metric_type,
    'average_query_time' as metric_name,
    50 + random() * 200 as metric_value, -- Random query times between 50-250ms
    'milliseconds' as metric_unit,
    NOW() - (interval '1 minute' * generate_series(1, 60)) as collected_at
FROM tenants t
CROSS JOIN generate_series(1, 60); -- 60 data points per tenant

-- ============================================================================
-- TEST SCENARIOS AND VALIDATION FUNCTIONS
-- ============================================================================

-- Function to test tenant isolation
CREATE OR REPLACE FUNCTION test_tenant_isolation_comprehensive()
RETURNS TABLE(
    test_name TEXT,
    tenant_tested UUID,
    expected_result INTEGER,
    actual_result INTEGER,
    status TEXT
) AS $$
DECLARE
    tenant_1 UUID := '11111111-1111-1111-1111-111111111111';
    tenant_2 UUID := '22222222-2222-2222-2222-222222222222';
    tenant_3 UUID := '33333333-3333-3333-3333-333333333333';
    test_tenants UUID[] := ARRAY[tenant_1, tenant_2, tenant_3];
    current_tenant UUID;
    expected_users INTEGER;
    actual_users INTEGER;
    expected_news INTEGER;
    actual_news INTEGER;
BEGIN
    FOREACH current_tenant IN ARRAY test_tenants
    LOOP
        -- Set tenant context
        PERFORM set_secure_tenant_context(current_tenant);
        
        -- Test user isolation
        SELECT COUNT(*) INTO expected_users FROM users WHERE tenant_id = current_tenant;
        SELECT COUNT(*) INTO actual_users FROM users; -- Should only see current tenant's users
        
        RETURN QUERY SELECT 
            'User Isolation Test'::TEXT,
            current_tenant,
            expected_users,
            actual_users,
            CASE WHEN expected_users = actual_users THEN 'PASS' ELSE 'FAIL' END::TEXT;
        
        -- Test news isolation
        SELECT COUNT(*) INTO expected_news FROM news WHERE tenant_id = current_tenant AND status = 'published';
        SELECT COUNT(*) INTO actual_news FROM news WHERE status = 'published'; -- Should only see current tenant's news
        
        RETURN QUERY SELECT 
            'News Isolation Test'::TEXT,
            current_tenant,
            expected_news,
            actual_news,
            CASE WHEN expected_news = actual_news THEN 'PASS' ELSE 'FAIL' END::TEXT;
    END LOOP;
    
    -- Clear context
    PERFORM clear_tenant_context();
END;
$$ LANGUAGE plpgsql;

-- Function to test performance under load
CREATE OR REPLACE FUNCTION test_performance_load()
RETURNS TABLE(
    test_type TEXT,
    query_description TEXT,
    execution_time_ms DECIMAL(10,3),
    rows_processed INTEGER,
    performance_rating TEXT
) AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time DECIMAL(10,3);
    row_count INTEGER;
BEGIN
    -- Test 1: Complex join query
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM news n
    JOIN users u ON n.author_id = u.id
    JOIN categories c ON n.category_id = c.id
    LEFT JOIN content_tags ct ON ct.content_id = n.id AND ct.content_type = 'news'
    WHERE n.status = 'published';
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Complex Join'::TEXT,
        'News with authors, categories, and tags'::TEXT,
        execution_time,
        row_count,
        CASE 
            WHEN execution_time < 100 THEN 'Excellent'
            WHEN execution_time < 500 THEN 'Good'
            WHEN execution_time < 1000 THEN 'Fair'
            ELSE 'Poor'
        END::TEXT;
    
    -- Test 2: Full-text search
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM news
    WHERE to_tsvector('english', title || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', 'technology');
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Full-text Search'::TEXT,
        'Search for "technology" in news content'::TEXT,
        execution_time,
        row_count,
        CASE 
            WHEN execution_time < 50 THEN 'Excellent'
            WHEN execution_time < 200 THEN 'Good'
            WHEN execution_time < 500 THEN 'Fair'
            ELSE 'Poor'
        END::TEXT;
    
    -- Test 3: Analytics aggregation
    start_time := clock_timestamp();
    
    SELECT COUNT(*) INTO row_count
    FROM page_views pv
    JOIN news n ON pv.content_id = n.id
    WHERE pv.created_at > NOW() - INTERVAL '30 days'
    GROUP BY pv.tenant_id, n.category_id;
    
    end_time := clock_timestamp();
    execution_time := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;
    
    RETURN QUERY SELECT 
        'Analytics Aggregation'::TEXT,
        'Page views by tenant and category (30 days)'::TEXT,
        execution_time,
        row_count,
        CASE 
            WHEN execution_time < 200 THEN 'Excellent'
            WHEN execution_time < 1000 THEN 'Good'
            WHEN execution_time < 2000 THEN 'Fair'
            ELSE 'Poor'
        END::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate data integrity
CREATE OR REPLACE FUNCTION validate_sample_data_integrity()
RETURNS TABLE(
    validation_type TEXT,
    description TEXT,
    status TEXT,
    details TEXT
) AS $$
DECLARE
    orphaned_count INTEGER;
    duplicate_count INTEGER;
    invalid_count INTEGER;
BEGIN
    -- Check for orphaned users
    SELECT COUNT(*) INTO orphaned_count
    FROM users u
    LEFT JOIN tenants t ON u.tenant_id = t.id
    WHERE t.id IS NULL;
    
    RETURN QUERY SELECT 
        'Data Integrity'::TEXT,
        'Orphaned users check'::TEXT,
        CASE WHEN orphaned_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        format('Found %s orphaned users', orphaned_count);
    
    -- Check for duplicate content slugs within tenants
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT tenant_id, slug, COUNT(*) as slug_count
        FROM news
        GROUP BY tenant_id, slug
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RETURN QUERY SELECT 
        'Data Integrity'::TEXT,
        'Duplicate news slugs check'::TEXT,
        CASE WHEN duplicate_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        format('Found %s duplicate slug groups', duplicate_count);
    
    -- Check for invalid email formats
    SELECT COUNT(*) INTO invalid_count
    FROM users
    WHERE email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
    
    RETURN QUERY SELECT 
        'Data Integrity'::TEXT,
        'Invalid email formats check'::TEXT,
        CASE WHEN invalid_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        format('Found %s invalid email formats', invalid_count);
    
    -- Check tenant configuration completeness
    SELECT COUNT(*) INTO invalid_count
    FROM tenants
    WHERE config IS NULL OR config = '{}' OR features IS NULL OR features = '{}';
    
    RETURN QUERY SELECT 
        'Configuration'::TEXT,
        'Tenant configuration completeness'::TEXT,
        CASE WHEN invalid_count = 0 THEN 'PASS' ELSE 'FAIL' END::TEXT,
        format('Found %s tenants with incomplete configuration', invalid_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND RESET FUNCTIONS
-- ============================================================================

-- Function to reset test environment
CREATE OR REPLACE FUNCTION reset_test_environment()
RETURNS TEXT AS $$
BEGIN
    -- Clear tenant context
    PERFORM clear_tenant_context();
    
    -- Disable RLS bypass
    PERFORM set_config('app.bypass_rls', 'false', true);
    
    RETURN 'Test environment reset completed. RLS is now active.';
END;
$$ LANGUAGE plpgsql;

-- Function to generate additional test data
CREATE OR REPLACE FUNCTION generate_load_test_data(scale_factor INTEGER DEFAULT 1)
RETURNS TEXT AS $$
DECLARE
    i INTEGER;
    tenant_ids UUID[] := ARRAY[
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '33333333-3333-3333-3333-333333333333'
    ];
    current_tenant UUID;
    report TEXT := '';
BEGIN
    -- Enable bypass for bulk data generation
    PERFORM set_config('app.bypass_rls', 'true', true);
    
    FOREACH current_tenant IN ARRAY tenant_ids
    LOOP
        -- Generate additional users
        FOR i IN 1..(10 * scale_factor)
        LOOP
            INSERT INTO users (tenant_id, email, password_hash, password_salt, first_name, last_name, role, status, created_at)
            VALUES (
                current_tenant,
                'testuser' || i || '@tenant' || substring(current_tenant::text, 1, 8) || '.com',
                crypt('TestPass123!', gen_salt('bf')),
                gen_salt('bf'),
                'Test',
                'User' || i,
                'user',
                'active',
                NOW() - (random() * interval '365 days')
            );
        END LOOP;
        
        -- Generate additional news articles
        FOR i IN 1..(20 * scale_factor)
        LOOP
            INSERT INTO news (tenant_id, title, slug, excerpt, content, status, visibility, author_id, view_count, like_count, published_at, created_by)
            SELECT 
                current_tenant,
                'Test News Article ' || i,
                'test-news-article-' || i,
                'This is a test excerpt for article ' || i,
                'This is test content for article ' || i || '. It contains multiple paragraphs and sufficient content for testing purposes.',
                'published',
                'public',
                u.id,
                floor(random() * 1000)::int,
                floor(random() * 100)::int,
                NOW() - (random() * interval '30 days'),
                u.id
            FROM users u
            WHERE u.tenant_id = current_tenant AND u.role IN ('editor', 'admin')
            ORDER BY random()
            LIMIT 1;
        END LOOP;
        
        report := report || format('Generated %s users and %s news articles for tenant %s\n', 
                                  10 * scale_factor, 20 * scale_factor, current_tenant);
    END LOOP;
    
    -- Generate page views for the new content
    INSERT INTO page_views (tenant_id, content_type, content_id, url, path, user_id, ip_address, device_type, browser, country, created_at)
    SELECT 
        n.tenant_id,
        'news',
        n.id,
        '/news/' || n.slug,
        '/news/' || n.slug,
        CASE WHEN random() > 0.3 THEN 
            (SELECT u.id FROM users u WHERE u.tenant_id = n.tenant_id ORDER BY random() LIMIT 1)
        ELSE NULL END,
        ('10.0.' || floor(random() * 255)::int || '.' || floor(random() * 255)::int)::inet,
        (ARRAY['desktop', 'mobile', 'tablet'])[floor(random() * 3 + 1)],
        (ARRAY['Chrome', 'Firefox', 'Safari', 'Edge'])[floor(random() * 4 + 1)],
        (ARRAY['US', 'CA', 'GB', 'AU', 'DE', 'FR'])[floor(random() * 6 + 1)],
        n.published_at + (random() * (NOW() - n.published_at))
    FROM news n
    WHERE n.title LIKE 'Test News Article%'
    CROSS JOIN generate_series(1, (5 * scale_factor)); -- Multiple views per article
    
    report := report || format('Generated page view data for load testing\n');
    
    -- Disable bypass
    PERFORM set_config('app.bypass_rls', 'false', true);
    
    RETURN report || 'Load test data generation completed successfully.';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS FOR TEST FUNCTIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION test_tenant_isolation_comprehensive() TO app_admin, app_monitoring;
GRANT EXECUTE ON FUNCTION test_performance_load() TO app_admin, app_monitoring;
GRANT EXECUTE ON FUNCTION validate_sample_data_integrity() TO app_admin, app_monitoring;
GRANT EXECUTE ON FUNCTION reset_test_environment() TO app_admin;
GRANT EXECUTE ON FUNCTION generate_load_test_data(INTEGER) TO app_admin;

-- ============================================================================
-- FINALIZE SAMPLE DATA SETUP
-- ============================================================================

-- Reset to normal operation mode
SELECT reset_test_environment();

-- Run initial validation
SELECT 'Sample data loaded successfully. Running validation...' as status;
SELECT * FROM validate_sample_data_integrity();

-- Display summary statistics
SELECT 'Data Summary:' as section, 
       COUNT(*) as total_tenants,
       (SELECT COUNT(*) FROM users) as total_users,
       (SELECT COUNT(*) FROM news WHERE status = 'published') as published_news,
       (SELECT COUNT(*) FROM blogs WHERE status = 'published') as published_blogs,
       (SELECT COUNT(*) FROM programs WHERE status = 'published') as published_programs
FROM tenants;

COMMENT ON FUNCTION test_tenant_isolation_comprehensive() IS 'Comprehensive test of tenant data isolation using RLS policies';
COMMENT ON FUNCTION test_performance_load() IS 'Performance testing with realistic query patterns and data volumes';
COMMENT ON FUNCTION validate_sample_data_integrity() IS 'Validates integrity and consistency of sample data';
COMMENT ON FUNCTION generate_load_test_data(INTEGER) IS 'Generates additional test data for load testing (scale_factor multiplies base amounts)';