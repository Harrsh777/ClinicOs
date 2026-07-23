-- Migration: 029_clinic_branding_themes.sql
-- Module: Clinic Branding Themes & Consultation Toggles for ClinicOS

ALTER TABLE public.clinic_branding
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_preset TEXT DEFAULT 'clinical_teal',
  ADD COLUMN IF NOT EXISTS specialization_badge TEXT,
  ADD COLUMN IF NOT EXISTS bio_description TEXT,
  ADD COLUMN IF NOT EXISTS teleconsult_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS emergency_enabled BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS emergency_available BOOLEAN DEFAULT true;
