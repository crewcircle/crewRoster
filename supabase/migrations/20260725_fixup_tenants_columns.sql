-- =============================================================================
-- Migration: Fixup — Add missing tenants columns and fix DEFAULT value
-- Date: 2026-07-25
--
-- 1. Adds tenants.slug and tenants.owner_id columns referenced by the
--    handle_new_user() trigger in 20260723_add_tenant_members.sql but
--    missing from the canonical core schema (20260328_core_schema.sql).
--
-- 2. Changes tenant_members.role DEFAULT from 'member' to 'employee'
--    because the user_role enum only allows ('owner', 'manager', 'employee').
-- =============================================================================

-- Add slug column (used for tenant URL slugs)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS slug text;

-- Add unique constraint on slug for URL uniqueness
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_key'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Add owner_id column (the auth.users ID that owns the tenant)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Fix: change tenant_members.role DEFAULT from 'member' to 'employee'
-- ('member' is not a valid user_role enum value)
ALTER TABLE tenant_members
  ALTER COLUMN role SET DEFAULT 'employee';
