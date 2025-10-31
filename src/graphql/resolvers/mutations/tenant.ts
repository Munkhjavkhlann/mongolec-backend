import { GraphQLContext } from '@/types';
import { GraphQLError } from 'graphql';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TENANT_MUTATIONS');

/**
 * Validates that a slug follows kebab-case format (lowercase with hyphens)
 */
function validateSlugFormat(slug: string): boolean {
  const kebabCaseRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return kebabCaseRegex.test(slug);
}

/**
 * Valid tenant status values
 */
const VALID_TENANT_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING', 'ARCHIVED'] as const;

/**
 * Valid tenant plan values
 */
const VALID_TENANT_PLANS = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'] as const;

/**
 * Validates tenant status enum value
 */
function validateTenantStatus(status: string): void {
  if (!VALID_TENANT_STATUSES.includes(status as any)) {
    throw new GraphQLError(
      `Invalid tenant status: ${status}. Valid values are: ${VALID_TENANT_STATUSES.join(', ')}`
    );
  }
}

/**
 * Validates tenant plan enum value
 */
function validateTenantPlan(plan: string): void {
  if (!VALID_TENANT_PLANS.includes(plan as any)) {
    throw new GraphQLError(
      `Invalid tenant plan: ${plan}. Valid values are: ${VALID_TENANT_PLANS.join(', ')}`
    );
  }
}

/**
 * Tenant Mutation Resolvers
 * Handles CRUD operations for tenants with proper validation
 */
export const tenantMutations = {
  /**
   * Create a new tenant
   * Validates slug format and uniqueness, initializes with default config
   */
  createTenant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { input } = args;

      // TODO: Add admin role check in production
      // if (!context.user || !context.user.roles.includes('ADMIN')) {
      //   throw new GraphQLError('Unauthorized: Admin access required');
      // }

      // Validate required fields
      if (!input.name || input.name.trim().length === 0) {
        throw new GraphQLError('Tenant name is required');
      }

      if (!input.slug || input.slug.trim().length === 0) {
        throw new GraphQLError('Tenant slug is required');
      }

      // Normalize slug to lowercase and validate format
      const normalizedSlug = input.slug.toLowerCase().trim();

      // Validate slug is in kebab-case format
      if (!validateSlugFormat(normalizedSlug)) {
        throw new GraphQLError(
          'Slug must be in kebab-case format (lowercase letters, numbers, and hyphens only). Example: my-organization'
        );
      }

      // Check if slug already exists
      const existingTenant = await context.prisma.tenant.findUnique({
        where: { slug: normalizedSlug },
      });

      if (existingTenant) {
        throw new GraphQLError(`Tenant with slug "${normalizedSlug}" already exists`);
      }

      // Check if domain already exists (if provided)
      if (input.domain) {
        const domainExists = await context.prisma.tenant.findUnique({
          where: { domain: input.domain },
        });

        if (domainExists) {
          throw new GraphQLError(`Tenant with domain "${input.domain}" already exists`);
        }
      }

      // Determine status: prioritize explicit status, then isActive, then default to ACTIVE
      let status = 'ACTIVE';
      if (input.status) {
        validateTenantStatus(input.status);
        status = input.status;
      } else if (input.isActive === false) {
        status = 'INACTIVE';
      }

      // Determine plan: use provided plan or default to FREE
      const plan = input.plan || 'FREE';
      if (input.plan) {
        validateTenantPlan(input.plan);
      }

      // Create tenant with validated data
      const tenant = await context.prisma.tenant.create({
        data: {
          name: input.name.trim(),
          slug: normalizedSlug,
          domain: input.domain?.trim() || null,
          status: status as any,
          plan: plan as any,
        },
      });

      logger.info(`Created tenant: ${tenant.slug} (${tenant.id})`);

      return tenant;
    } catch (error) {
      logger.error('Error creating tenant', error as Error);

      // Re-throw GraphQLErrors as-is
      if (error instanceof GraphQLError) {
        throw error;
      }

      // Handle Prisma unique constraint violations
      if ((error as any).code === 'P2002') {
        const target = (error as any).meta?.target || [];
        if (target.includes('slug')) {
          throw new GraphQLError('A tenant with this slug already exists');
        }
        if (target.includes('domain')) {
          throw new GraphQLError('A tenant with this domain already exists');
        }
      }

      throw new GraphQLError('Failed to create tenant');
    }
  },

  /**
   * Update an existing tenant
   * Allows updating name, slug, domain, isActive status, and config
   */
  updateTenant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id, input } = args;

      // TODO: Add admin role check in production
      // if (!context.user || !context.user.roles.includes('ADMIN')) {
      //   throw new GraphQLError('Unauthorized: Admin access required');
      // }

      // Check if tenant exists
      const existingTenant = await context.prisma.tenant.findUnique({
        where: { id },
      });

      if (!existingTenant || existingTenant.deletedAt) {
        throw new GraphQLError('Tenant not found');
      }

      // Build update data object
      const updateData: any = {};

      // Update name if provided
      if (input.name !== undefined) {
        if (input.name.trim().length === 0) {
          throw new GraphQLError('Tenant name cannot be empty');
        }
        updateData.name = input.name.trim();
      }

      // Update slug if provided
      if (input.slug !== undefined) {
        const normalizedSlug = input.slug.toLowerCase().trim();

        if (!validateSlugFormat(normalizedSlug)) {
          throw new GraphQLError(
            'Slug must be in kebab-case format (lowercase letters, numbers, and hyphens only)'
          );
        }

        // Check if new slug conflicts with existing tenant
        if (normalizedSlug !== existingTenant.slug) {
          const slugExists = await context.prisma.tenant.findUnique({
            where: { slug: normalizedSlug },
          });

          if (slugExists) {
            throw new GraphQLError(`Tenant with slug "${normalizedSlug}" already exists`);
          }

          updateData.slug = normalizedSlug;
        }
      }

      // Update domain if provided
      if (input.domain !== undefined) {
        const domain = input.domain?.trim() || null;

        if (domain && domain !== existingTenant.domain) {
          const domainExists = await context.prisma.tenant.findUnique({
            where: { domain },
          });

          if (domainExists) {
            throw new GraphQLError(`Tenant with domain "${domain}" already exists`);
          }
        }

        updateData.domain = domain;
      }

      // Update status: prioritize explicit status over isActive flag
      if (input.status !== undefined) {
        validateTenantStatus(input.status);
        updateData.status = input.status;
      } else if (input.isActive !== undefined) {
        // If only isActive is provided, map it to status
        updateData.status = input.isActive ? 'ACTIVE' : 'INACTIVE';
      }

      // Update plan if provided
      if (input.plan !== undefined) {
        validateTenantPlan(input.plan);
        updateData.plan = input.plan;
      }

      // Perform update
      const updatedTenant = await context.prisma.tenant.update({
        where: { id },
        data: updateData,
      });

      logger.info(`Updated tenant: ${updatedTenant.slug} (${updatedTenant.id})`);

      return updatedTenant;
    } catch (error) {
      logger.error('Error updating tenant', error as Error);

      // Re-throw GraphQLErrors as-is
      if (error instanceof GraphQLError) {
        throw error;
      }

      // Handle Prisma unique constraint violations
      if ((error as any).code === 'P2002') {
        const target = (error as any).meta?.target || [];
        if (target.includes('slug')) {
          throw new GraphQLError('A tenant with this slug already exists');
        }
        if (target.includes('domain')) {
          throw new GraphQLError('A tenant with this domain already exists');
        }
      }

      throw new GraphQLError('Failed to update tenant');
    }
  },

  /**
   * Delete a tenant (soft delete)
   * Prevents deletion if tenant has existing users or products
   */
  deleteTenant: async (_parent: any, args: any, context: GraphQLContext) => {
    try {
      const { id } = args;

      // TODO: Add admin role check in production
      // if (!context.user || !context.user.roles.includes('ADMIN')) {
      //   throw new GraphQLError('Unauthorized: Admin access required');
      // }

      // Check if tenant exists
      const tenant = await context.prisma.tenant.findUnique({
        where: { id },
        include: {
          users: true,
          merchProducts: true,
          newsArticles: true,
          content: true,
        },
      });

      if (!tenant || tenant.deletedAt) {
        throw new GraphQLError('Tenant not found');
      }

      // Prevent deletion if tenant has users
      if (tenant.users.length > 0) {
        throw new GraphQLError(
          `Cannot delete tenant: ${tenant.users.length} user(s) are associated with this tenant. Please remove or reassign users first.`
        );
      }

      // Prevent deletion if tenant has products
      if (tenant.merchProducts.length > 0) {
        throw new GraphQLError(
          `Cannot delete tenant: ${tenant.merchProducts.length} product(s) are associated with this tenant. Please remove products first.`
        );
      }

      // Prevent deletion if tenant has news articles
      if (tenant.newsArticles.length > 0) {
        throw new GraphQLError(
          `Cannot delete tenant: ${tenant.newsArticles.length} news article(s) are associated with this tenant. Please remove articles first.`
        );
      }

      // Prevent deletion if tenant has content
      if (tenant.content.length > 0) {
        throw new GraphQLError(
          `Cannot delete tenant: ${tenant.content.length} content item(s) are associated with this tenant. Please remove content first.`
        );
      }

      // Perform soft delete by setting deletedAt timestamp
      await context.prisma.tenant.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'ARCHIVED',
        },
      });

      logger.info(`Soft deleted tenant: ${tenant.slug} (${tenant.id})`);

      return true;
    } catch (error) {
      logger.error('Error deleting tenant', error as Error);

      // Re-throw GraphQLErrors as-is
      if (error instanceof GraphQLError) {
        throw error;
      }

      throw new GraphQLError('Failed to delete tenant');
    }
  },
};
