-- =====================================================
-- SQL Script: Create Tenant Admin with Tenant Creation Rights
-- =====================================================

-- 1. Create a new super admin user for tenant management
INSERT INTO super_admins (username, email, password_hash, created_at, updated_at)
VALUES (
    'tenant_admin',
    'tenant.admin@cas-portal.com',
    '$2b$10$rQZ8K9mN2pL4vX7wY3hJ6tA1sB5cD8eF0gH3iI4jK5lM6nO7pQ8rS9tU0vW1x2y3z4',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- 2. Create a new tenant for the tenant admin
INSERT INTO tenants (
    name,
    subdomain,
    database_schema,
    logo_path,
    primary_color,
    secondary_color,
    contact_email,
    contact_phone,
    address,
    is_active,
    created_by,
    created_at,
    updated_at
)
VALUES (
    'Tenant Management Corp',
    'tenantmgmt',
    'tenant_tenantmgmt',
    NULL,
    '#10B981',
    '#059669',
    'admin@tenantmgmt.com',
    '+31 6 12345678',
    'Tenant Management Street 123, 1234 AB Amsterdam',
    TRUE,
    (SELECT id FROM super_admins WHERE email = 'tenant.admin@cas-portal.com'),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (subdomain) DO NOTHING;

-- 3. Create the tenant schema
SELECT create_tenant_schema('tenant_tenantmgmt');

-- 4. Create roles in the tenant schema
INSERT INTO tenant_tenantmgmt.roles (name, description, permissions, created_at)
VALUES 
    ('Tenant Manager', 'Can create and manage tenants', '["all", "tenants:create", "tenants:read", "tenants:update", "tenants:delete", "users:create", "users:read", "users:update", "users:delete"]', CURRENT_TIMESTAMP),
    ('Tenant Admin', 'Can manage tenant settings and users', '["all", "users:create", "users:read", "users:update", "users:delete", "settings:read", "settings:update"]', CURRENT_TIMESTAMP),
    ('Security Officer', 'Can manage incidents and actions', '["incidents:create", "incidents:read", "incidents:update", "actions:create", "actions:read", "actions:update", "actions:delete"]', CURRENT_TIMESTAMP),
    ('Viewer', 'Can view incidents and reports', '["incidents:read", "actions:read", "reports:read"]', CURRENT_TIMESTAMP);

-- 5. Create the tenant admin user in the tenant schema
INSERT INTO tenant_tenantmgmt.users (username, email, password_hash, role_id, is_active, created_at, updated_at)
VALUES (
    'tenant_admin',
    'admin@tenantmgmt.com',
    '$2b$10$rQZ8K9mN2pL4vX7wY3hJ6tA1sB5cD8eF0gH3iI4jK5lM6nO7pQ8rS9tU0vW1x2y3z4',
    (SELECT id FROM tenant_tenantmgmt.roles WHERE name = 'Tenant Manager'),
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- 6. Create additional tenant settings
INSERT INTO tenant_settings (tenant_id, setting_key, setting_value, created_at, updated_at)
VALUES 
    ((SELECT id FROM tenants WHERE subdomain = 'tenantmgmt'), 'max_users', '100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ((SELECT id FROM tenants WHERE subdomain = 'tenantmgmt'), 'max_incidents', '1000', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ((SELECT id FROM tenants WHERE subdomain = 'tenantmgmt'), 'tenant_creation_enabled', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ((SELECT id FROM tenants WHERE subdomain = 'tenantmgmt'), 'auto_backup_enabled', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. Create additional users for testing
INSERT INTO tenant_tenantmgmt.users (username, email, password_hash, role_id, is_active, created_at, updated_at)
VALUES 
    ('test_admin', 'admin@test.com', '$2b$10$rQZ8K9mN2pL4vX7wY3hJ6tA1sB5cD8eF0gH3iI4jK5lM6nO7pQ8rS9tU0vW1x2y3z4', (SELECT id FROM tenant_tenantmgmt.roles WHERE name = 'Tenant Admin'), TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('security_officer', 'security@test.com', '$2b$10$rQZ8K9mN2pL4vX7wY3hJ6tA1sB5cD8eF0gH3iI4jK5lM6nO7pQ8rS9tU0vW1x2y3z4', (SELECT id FROM tenant_tenantmgmt.roles WHERE name = 'Security Officer'), TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('viewer', 'viewer@test.com', '$2b$10$rQZ8K9mN2pL4vX7wY3hJ6tA1sB5cD8eF0gH3iI4jK5lM6nO7pQ8rS9tU0vW1x2y3z4', (SELECT id FROM tenant_tenantmgmt.roles WHERE name = 'Viewer'), TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if tenant admin was created
SELECT 'Super Admin Created:' as status, username, email FROM super_admins WHERE email = 'tenant.admin@cas-portal.com';

-- Check if tenant was created
SELECT 'Tenant Created:' as status, name, subdomain, is_active FROM tenants WHERE subdomain = 'tenantmgmt';

-- Check if tenant schema exists
SELECT 'Tenant Schema:' as status, schema_name FROM information_schema.schemata WHERE schema_name = 'tenant_tenantmgmt';

-- Check if roles were created
SELECT 'Roles Created:' as status, name, description FROM tenant_tenantmgmt.roles;

-- Check if users were created
SELECT 'Users Created:' as status, username, email, role_id FROM tenant_tenantmgmt.users;

-- Check tenant settings
SELECT 'Tenant Settings:' as status, setting_key, setting_value FROM tenant_settings WHERE tenant_id = (SELECT id FROM tenants WHERE subdomain = 'tenantmgmt'); 