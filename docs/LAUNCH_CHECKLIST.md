# ClinicOS Launch Checklist

## Security
- [x] RLS policies on all Sprint 5 tables
- [x] Service role key server-only
- [x] Webhook secret verification (WhatsApp)
- [x] Cron route authentication
- [ ] Penetration test sign-off

## Features (Sprint 5)
- [x] Telemedicine video sessions
- [x] AI Medical Scribe
- [x] WhatsApp appointment bot webhook
- [x] AI Billing insights dashboard
- [x] AI Follow-up cron
- [x] Health risk detection
- [x] Accounting P&L + CSV export
- [x] Doctor commission management
- [x] Super Admin analytics (MRR, AI usage)
- [x] White-label branding settings

## Production
- [x] Health check endpoint (`/api/health`)
- [x] Custom 404 and error pages
- [x] Privacy policy and Terms of Service
- [x] Marketing landing page
- [ ] Sentry error tracking configured
- [ ] Vercel env vars set (OPENAI_API_KEY, DAILY_API_KEY, CRON_SECRET, WHATSAPP_*)
- [ ] Supabase backup schedule verified

## Pre-Launch Testing
- [ ] Run `node scripts/seed-demo-user.mjs`
- [ ] Apply `supabase/migrations/005_sprint_5.sql` in Supabase SQL Editor
- [ ] Test `/api/health`
- [ ] Test WhatsApp webhook POST
- [ ] Test AI scribe in consultation room
- [ ] Test teleconsult doctor ↔ patient flow
- [ ] Verify owner P&L and commission reports
