# ClinicOS AI — Product Vision

> **Working name:** ClinicOS AI  
> **Stack:** Next.js · Supabase (DB + Auth) · Vercel (deploy)

A multi-tenant SaaS platform for clinic operations and patient care.

---

## What We Are Building

ClinicOS AI helps clinics manage day-to-day operations — patients, doctors, appointments, prescriptions, billing, insurance, medical records, lab reports, pharmacy, AI assistants, telemedicine, and follow-ups — while giving patients a modern digital experience for booking, payments, tokens, history, and teleconsultations.

Each clinic is an isolated tenant. Clinic A never sees Clinic B's data.

---

## Platform Capabilities (Clinic Side)

| Area | Capabilities |
|------|--------------|
| Patients | Registration, profiles, vitals, documents, history |
| Doctors | Staff management, schedules, consultations |
| Appointments | Booking, approval, rescheduling, queue tokens |
| Prescriptions | E-prescriptions with allergy checks, PDF delivery |
| Billing | Auto bills, UPI/card/cash/insurance, AI billing assistant |
| Insurance | Policies, claims, tracking, approval status |
| Medical Records | Full visit timeline (EMR) |
| Lab Reports | Orders, uploads, AI plain-language analysis |
| Pharmacy | Stock, expiry alerts, dispensing |
| Inventory | Syringes, gloves, PPE, test kits, low-stock alerts |
| AI Assistants | Scribe, appointment bot, billing, follow-up, health risk |
| Telemedicine | Video consultations with prescribing |
| Follow-ups | Automated patient check-ins |

---

## Platform Capabilities (Patient Side)

| Capability | Description |
|------------|-------------|
| Appointment booking | Choose doctor and time slot |
| Digital token system | Live queue position and expected wait time |
| Online payments | UPI, card, and other methods |
| Medical history | Past visits, vitals trends, documents |
| Prescriptions | View and download e-prescriptions |
| Lab reports | Access results with notifications |
| Teleconsultations | Join video calls, share reports |
| QR check-in | Scan clinic QR on arrival for automatic check-in and token |

---

## User Types & Permissions

### Super Admin (Platform — your company)

- Manage subscriptions
- Manage clinics (create, suspend, configure)
- Manage plans (pricing tiers, feature flags)
- Revenue analytics (platform-wide)
- AI usage analytics
- White-label management (branding per clinic or partner)

### Clinic Owner

- Owns one clinic tenant
- Add doctors and receptionists
- View clinic revenue
- Manage inventory (pharmacy + supplies)
- Configure clinic settings (hours, fees, branding)

### Doctor

- View assigned patients
- Write prescriptions
- View patient history and vitals trends
- Create consultation notes
- Generate referrals
- Order lab tests
- Conduct teleconsultations

### Receptionist

- Register patients (walk-in and scheduled)
- Book appointments (walk-in, emergency, scheduled)
- Generate and manage queue tokens
- Update current token number (patients see updates in real time)
- Take payments
- QR check-in support

### Patient

- Book appointments
- Pay online
- Receive and track queue token
- View lab reports and prescriptions
- Access medical history
- Join teleconsultations

---

## Multi-Tenant Architecture

```
Platform
│
├── Clinic A
│   ├── Doctors
│   ├── Patients
│   ├── Billing
│   └── Reports
│
├── Clinic B
│   ├── Doctors
│   ├── Patients
│   ├── Billing
│   └── Reports
│
└── Clinic C
    └── ...
```

**Rule:** Each clinic sees only its own data. Enforced via `clinic_id` on every row and Supabase Row Level Security (RLS).

---

## Modules Overview

| # | Module | Summary |
|---|--------|---------|
| 1 | Patient Management | Core patient records, vitals, documents, trends |
| 2 | Appointment Management | Booking, approval, smart queue, tokens |
| 3 | Consultation Management | Live consultation workflow and notes |
| 4 | E-Prescriptions | Digital prescriptions with safety checks |
| 5 | Medical Records (EMR) | Complete visit timeline |
| 6 | Billing | Invoices, payments, AI billing assistant |
| 7 | Insurance | Policies and claims lifecycle |
| 8 | Lab Management | Test orders, report upload, AI analysis |
| 9 | Pharmacy Management | Medicine stock and expiry |
| 10 | Inventory | Clinic supplies and low-stock alerts |
| 11 | Telemedicine | Video consultations |

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full use cases, features, edge cases, and technical design.

---

## AI Features (Differentiators)

| Feature | Description |
|---------|-------------|
| AI Medical Scribe | Speech → symptoms, diagnosis, notes, prescription draft |
| AI Appointment Assistant | WhatsApp chatbot for automatic slot booking |
| AI Billing Assistant | Missing charges, duplicate billing, unpaid invoices, insurance eligibility |
| AI Follow-Up Agent | Automated calls/messages; updates adherence in system |
| AI Health Risk Detection | Analyzes BP, weight, sugar; flags risks (e.g. diabetes) |
| AI Lab Analysis | Plain-language explanation of lab results |

---

## Financial Management

### Accounting Module

Many clinics still use Excel. ClinicOS provides:

- Income and expense tracking
- Salaries, rent, utilities
- Profit & Loss reports
- Cash flow reports
- Tax reports

### Doctor Commission Management

For multi-doctor clinics:

- Automatic consultation revenue split (e.g. Doctor 60% / Clinic 40%)
- Configurable commission rules per doctor
- Monthly payout reports

---

## Smart Waiting Room

### QR Check-In

1. Patient arrives at clinic
2. Scans clinic QR code
3. System automatically checks them in and generates a token
4. No receptionist required for check-in

### Live Token Queue

- Receptionist can update the current token number
- Patients see their token, queue position, and expected time in **real time**
- Example display:
  - **Your Token:** #45
  - **Current Token:** #38
  - **Expected Time:** 4:20 PM

Reduces perceived waiting time and lobby congestion.

---

## Edge Cases (Cross-Module)

| Area | Edge Cases |
|------|------------|
| Patients | Weight/vitals trend history; optional Aadhaar |
| Appointments | No-show, late arrival, emergency, VIP, walk-in |
| Prescriptions | Allergy warnings (e.g. penicillin) |
| Billing | Duplicate charges, missing fees, unpaid invoices |
| Pharmacy | Expiry alerts (e.g. expires in 15 days) |
| Inventory | Low stock alerts |
| Queue | Priority ordering for emergency/VIP/walk-in |

---

## India-Specific Considerations

- Aadhaar (optional field on patient profile)
- UPI payments (Razorpay or similar)
- WhatsApp for appointment assistant
- Insurance claim workflows common in Indian clinics

---

## Deployment & Infrastructure

| Component | Choice |
|-----------|--------|
| Frontend + API | Next.js on Vercel |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage (reports, scans, prescriptions) |
| Real-time (tokens, queue) | Supabase Realtime |
| Edge / serverless | Vercel serverless functions + Server Actions |

---

## Document Index

| File | Purpose |
|------|---------|
| [PRODUCT_VISION.md](./PRODUCT_VISION.md) | This file — what we are building and why |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Technical architecture, all modules, use cases, features |
| [SPRINT_PLAN.md](./SPRINT_PLAN.md) | 5-sprint end-to-end development plan |
