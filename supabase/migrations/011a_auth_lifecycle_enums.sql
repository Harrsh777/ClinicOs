-- =============================================================================
-- Auth lifecycle — STEP 1 of 2: extend user_role enum
-- Run this file FIRST in Supabase SQL Editor, then run 011_auth_lifecycle.sql
-- (PostgreSQL requires new enum values to be committed before they can be used.)
-- =============================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'nurse';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'lab_technician';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'hr';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'administrator';
