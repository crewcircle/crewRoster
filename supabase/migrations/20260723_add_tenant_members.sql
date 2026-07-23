-- =============================================================================
-- Migration: Add tenant_members table and signup trigger
-- Date: 2026-07-23
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Table: tenant_members
-- Links profiles to tenants with a role. Required for multi-tenant RLS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  UNIQUE (tenant_id, profile_id)
);

ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Members can read their own membership
CREATE POLICY "tenant_members_self_read" ON tenant_members
  FOR SELECT
  USING (profile_id = (SELECT auth.uid()) AND deleted_at IS NULL);

-- Owners and managers can read all memberships in their tenant
CREATE POLICY "tenant_members_owner_manager_read" ON tenant_members
  FOR SELECT
  USING (get_tenant_role(tenant_id) IN ('owner', 'manager'));

-- Owners and managers can insert/update/delete memberships
CREATE POLICY "tenant_members_owner_manager_write" ON tenant_members
  FOR ALL
  USING (get_tenant_role(tenant_id) IN ('owner', 'manager'))
  WITH CHECK (get_tenant_role(tenant_id) IN ('owner', 'manager'));

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_profile_id ON tenant_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_deleted_at ON tenant_members(deleted_at)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Function: handle_new_user
-- Trigger: after auth.users INSERT, create tenant + profile + membership
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id   uuid;
  v_profile_id  uuid;
  v_tenant_name text;
  v_slug        text;
BEGIN
  -- Derive tenant name from metadata or email
  v_tenant_name := COALESCE(
    NEW.raw_user_meta_data->>'business_name',
    split_part(NEW.email, '@', 1) || E'''s Business'
  );

  -- Generate unique slug
  v_slug := lower(regexp_replace(v_tenant_name, '[^a-zA-Z0-9]', '-', 'g'));
  v_slug := left(v_slug, 60) || '-' || left(replace(NEW.id::text, '-', ''), 8);

  -- Create tenant
  INSERT INTO tenants (name, slug, owner_id)
  VALUES (v_tenant_name, v_slug, NEW.id)
  RETURNING id INTO v_tenant_id;

  -- Create profile
  INSERT INTO profiles (id, tenant_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'owner'
  )
  RETURNING id INTO v_profile_id;

  -- Create membership
  INSERT INTO tenant_members (tenant_id, profile_id, role)
  VALUES (v_tenant_id, v_profile_id, 'owner');

  RETURN NEW;
END;
$$;

-- Trigger on new auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Function: handle_invited_user
-- Trigger: after invited user accepts (auth.users created with invited metadata)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_invited_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
  v_role      text;
BEGIN
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::uuid;
  v_role      := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');

  IF v_tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create profile
  INSERT INTO profiles (id, tenant_id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    v_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create membership
  INSERT INTO tenant_members (tenant_id, profile_id, role)
  VALUES (v_tenant_id, NEW.id, v_role)
  ON CONFLICT (tenant_id, profile_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger for invited users (runs AFTER handle_new_user, so idempotent)
DROP TRIGGER IF EXISTS on_auth_user_invited ON auth.users;
CREATE TRIGGER on_auth_user_invited
  AFTER INSERT ON auth.users
  FOR EACH ROW
  WHEN (NEW.raw_user_meta_data->>'tenant_id' IS NOT NULL)
  EXECUTE FUNCTION public.handle_invited_user();
