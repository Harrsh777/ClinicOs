import type { SidebarSectionConfig } from "@/lib/navigation/types";

/**
 * Sidebar navigation aligned with implemented routes only.
 * Each item maps to a distinct page — no duplicate labels pointing at the same URL.
 * Sub-features (vitals, allergies, check-in, etc.) live inside their parent pages.
 */
const CLINIC_STAFF = [
  "clinic_owner",
  "doctor",
  "receptionist",
  "finance_manager",
] as const;

export const SIDEBAR_SECTIONS: SidebarSectionConfig[] = [
  {
    key: "admin-portal",
    label: "Administration",
    icon: "LayoutDashboard",
    roles: ["administrator"],
    groups: [
      {
        key: "admin-dashboard",
        name: "Overview",
        icon: "LayoutDashboard",
        moduleKey: "dashboard",
        items: [
          { key: "admin-overview", name: "Overview", path: "", moduleKey: "dashboard" },
          { key: "admin-appointments", name: "Today's Appointments", path: "/appointments", moduleKey: "appointments" },
          { key: "admin-staff", name: "Staff", path: "/staff", moduleKey: "staff" },
          { key: "admin-permissions", name: "Permissions", path: "/permissions", moduleKey: "permissions" },
        ],
      },
    ],
  },
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "LayoutDashboard",
    groups: [
      {
        key: "dashboard-main",
        name: "Overview",
        icon: "LayoutDashboard",
        moduleKey: "dashboard",
        items: [
          { key: "overview", name: "Overview", path: "", moduleKey: "dashboard" },
          {
            key: "ai-insights",
            name: "AI Insights",
            path: "/ai-insights",
            moduleKey: "ai_insights",
            roles: ["clinic_owner"],
          },
          {
            key: "patient-retention",
            name: "Patient Retention",
            path: "/retention",
            moduleKey: "patients",
            roles: ["clinic_owner", "doctor", "receptionist"],
          },
        ],
      },
    ],
  },
  {
    key: "patients",
    label: "Patients",
    icon: "Users",
    roles: [...CLINIC_STAFF, "patient"],
    groups: [
      {
        key: "patients-core",
        name: "Patient Records",
        icon: "Users",
        moduleKey: "patients",
        path: "/patients",
        items: [
          { key: "patient-list", name: "Patient List", path: "/patients", moduleKey: "patients" },
          {
            key: "add-patient",
            name: "Register Patient",
            path: "/patients/new",
            moduleKey: "patients",
            roles: ["clinic_owner", "receptionist"],
          },
        ],
      },
    ],
  },
  {
    key: "appointments",
    label: "Appointments & Queue",
    icon: "Calendar",
    roles: ["clinic_owner", "doctor", "receptionist"],
    groups: [
      {
        key: "appointments-core",
        name: "Scheduling",
        icon: "Calendar",
        moduleKey: "appointments",
        path: "/appointments",
        items: [
          {
            key: "today",
            name: "Today's Appointments",
            path: "/appointments",
            moduleKey: "appointments",
          },
        ],
      },
      {
        key: "queue-core",
        name: "Queue & Check-In",
        icon: "ListOrdered",
        moduleKey: "queue",
        path: "/queue",
        items: [
          { key: "active-queue", name: "Live Queue", path: "/queue", moduleKey: "queue" },
        ],
      },
    ],
  },
  {
    key: "consultations",
    label: "Consultations",
    icon: "Stethoscope",
    roles: ["clinic_owner", "doctor"],
    groups: [
      {
        key: "consultations-core",
        name: "Consultations",
        icon: "Stethoscope",
        moduleKey: "consultations",
        path: "/consultations",
        items: [
          {
            key: "consultations",
            name: "Consultation History",
            path: "/consultations",
            moduleKey: "consultations",
          },
          {
            key: "ai-doctor",
            name: "AI Doctor",
            path: "/ai-doctor",
            moduleKey: "consultations",
            roles: ["doctor"],
          },
          {
            key: "my-consultations",
            name: "My Consultations",
            path: "/my-consultations",
            moduleKey: "consultations",
            roles: ["clinic_owner"],
            requiresLinkedDoctor: true,
          },
        ],
      },
    ],
  },
  {
    key: "clinical-workspace",
    label: "Clinical Workspace",
    icon: "Stethoscope",
    roles: ["clinic_owner"],
    requiresLinkedDoctor: true,
    groups: [
      {
        key: "clinical-queue",
        name: "My Practice",
        icon: "ListOrdered",
        moduleKey: "queue",
        path: "/my-queue",
        requiresLinkedDoctor: true,
        items: [
          {
            key: "my-queue",
            name: "My Queue",
            path: "/my-queue",
            moduleKey: "queue",
            requiresLinkedDoctor: true,
          },
        ],
      },
      {
        key: "ai-doctor",
        name: "AI Assistant",
        icon: "Brain",
        moduleKey: "consultations",
        path: "/ai-doctor",
        items: [
          {
            key: "ai-doctor",
            name: "AI Doctor",
            path: "/ai-doctor",
            moduleKey: "consultations",
          },
        ],
      },
    ],
  },
  {
    key: "prescriptions",
    label: "Prescriptions",
    icon: "Pill",
    roles: ["clinic_owner", "doctor", "patient"],
    groups: [
      {
        key: "rx-core",
        name: "E-Prescriptions",
        icon: "Pill",
        moduleKey: "prescriptions",
        path: "/prescriptions",
        items: [
          {
            key: "rx-history",
            name: "Prescriptions",
            path: "/prescriptions",
            moduleKey: "prescriptions",
          },
        ],
      },
    ],
  },
  {
    key: "lab",
    label: "Lab & Pharmacy",
    icon: "FlaskConical",
    roles: ["clinic_owner", "doctor", "receptionist"],
    groups: [
      {
        key: "lab-catalog",
        name: "Lab",
        icon: "FlaskConical",
        moduleKey: "lab",
        path: "/lab",
        items: [
          {
            key: "lab-catalog",
            name: "Test Catalog",
            path: "/lab",
            moduleKey: "lab",
          },
        ],
      },
      {
        key: "pharmacy",
        name: "Pharmacy",
        icon: "PillBottle",
        moduleKey: "pharmacy",
        path: "/pharmacy",
        roles: ["clinic_owner", "receptionist"],
        items: [
          { key: "pharmacy", name: "Medicines & Stock", path: "/pharmacy", moduleKey: "pharmacy" },
        ],
      },
      {
        key: "inventory",
        name: "Supplies",
        icon: "Package",
        moduleKey: "inventory",
        path: "/inventory",
        roles: ["clinic_owner"],
        items: [
          { key: "inventory", name: "Inventory", path: "/inventory", moduleKey: "inventory" },
        ],
      },
    ],
  },
  {
    key: "billing",
    label: "Billing & Finance",
    icon: "IndianRupee",
    roles: ["clinic_owner", "receptionist", "finance_manager"],
    groups: [
      {
        key: "billing-core",
        name: "Billing",
        icon: "Receipt",
        moduleKey: "billing",
        path: "/billing",
        items: [
          { key: "invoices", name: "Invoices", path: "/billing", moduleKey: "billing" },
        ],
      },
      {
        key: "insurance",
        name: "Insurance",
        icon: "ShieldCheck",
        moduleKey: "insurance",
        path: "/insurance",
        items: [
          { key: "claims", name: "Claims", path: "/insurance", moduleKey: "insurance" },
        ],
      },
      {
        key: "revenue",
        name: "Revenue",
        icon: "TrendingUp",
        moduleKey: "revenue",
        path: "/revenue",
        roles: ["clinic_owner", "finance_manager"],
        items: [
          { key: "revenue-dashboard", name: "Revenue Dashboard", path: "/revenue", moduleKey: "revenue" },
        ],
      },
      {
        key: "accounting",
        name: "Accounting",
        icon: "Calculator",
        moduleKey: "accounting",
        path: "/accounting",
        roles: ["clinic_owner", "finance_manager"],
        items: [
          { key: "accounting", name: "P&L & Expenses", path: "/accounting", moduleKey: "accounting" },
        ],
      },
      {
        key: "commissions",
        name: "Commissions",
        icon: "Percent",
        moduleKey: "commissions",
        path: "/commissions",
        roles: ["clinic_owner"],
        items: [
          { key: "commissions", name: "Staff Commissions", path: "/commissions", moduleKey: "commissions" },
        ],
      },
    ],
  },
  {
    key: "staff",
    label: "Staff",
    icon: "UserCog",
    roles: ["clinic_owner", "administrator"],
    groups: [
      {
        key: "staff-core",
        name: "Team",
        icon: "UserCog",
        moduleKey: "staff",
        path: "/staff",
        items: [
          { key: "staff", name: "Staff & Invites", path: "/staff", moduleKey: "staff" },
        ],
      },
    ],
  },
  {
    key: "teleconsult",
    label: "Teleconsult",
    icon: "Video",
    roles: ["clinic_owner", "doctor", "patient"],
    groups: [
      {
        key: "teleconsult-core",
        name: "Video Consults",
        icon: "Video",
        moduleKey: "teleconsult",
        path: "/teleconsult",
        items: [
          { key: "teleconsult", name: "Teleconsult", path: "/teleconsult", moduleKey: "teleconsult" },
        ],
      },
    ],
  },
  {
    key: "conversations",
    label: "Conversations",
    icon: "MessageSquare",
    roles: ["clinic_owner", "receptionist", "doctor"],
    groups: [
      {
        key: "conversations-inbox",
        name: "WhatsApp Inbox",
        icon: "MessageSquare",
        moduleKey: "conversations",
        path: "/conversations",
        items: [
          {
            key: "conversations",
            name: "Inbox",
            path: "/conversations",
            moduleKey: "conversations",
          },
        ],
      },
    ],
  },
  {
    key: "franchise",
    label: "Franchise",
    icon: "Building2",
    roles: ["clinic_owner"],
    groups: [
      {
        key: "franchise-core",
        name: "Multi-Branch",
        icon: "Building2",
        moduleKey: "franchise",
        path: "/franchise",
        items: [
          { key: "franchise", name: "Branch Management", path: "/franchise", moduleKey: "franchise" },
        ],
      },
    ],
  },
  {
    key: "administration",
    label: "Settings",
    icon: "Settings",
    roles: ["clinic_owner", "administrator", "super_admin"],
    groups: [
      {
        key: "clinic-settings",
        name: "Clinic",
        icon: "Settings",
        moduleKey: "settings",
        path: "/settings",
        roles: ["clinic_owner"],
        items: [
          { key: "settings", name: "Clinic Settings", path: "/settings", moduleKey: "settings" },
        ],
      },
      {
        key: "branding",
        name: "Branding",
        icon: "Palette",
        moduleKey: "branding",
        path: "/branding",
        roles: ["clinic_owner"],
        items: [
          { key: "branding", name: "Logo & Theme", path: "/branding", moduleKey: "branding" },
        ],
      },
      {
        key: "conversations-settings",
        name: "Conversations",
        icon: "MessageSquare",
        moduleKey: "conversations",
        path: "/conversations",
        roles: ["clinic_owner"],
        items: [
          {
            key: "conversations-settings",
            name: "WhatsApp & Inbox",
            path: "/conversations",
            moduleKey: "conversations",
          },
        ],
      },
      {
        key: "permissions",
        name: "Access",
        icon: "Shield",
        moduleKey: "permissions",
        path: "/permissions",
        roles: ["clinic_owner", "administrator"],
        items: [
          { key: "permissions", name: "Roles & Permissions", path: "/permissions", moduleKey: "permissions" },
        ],
      },
      {
        key: "platform",
        name: "Platform",
        icon: "Building2",
        moduleKey: "clinics",
        path: "/clinics",
        roles: ["super_admin"],
        items: [
          { key: "clinics", name: "Clinics", path: "/clinics", moduleKey: "clinics" },
          {
            key: "demo-requests",
            name: "Demo Requests",
            path: "/demo-requests",
            moduleKey: "demo_requests",
          },
          {
            key: "applications",
            name: "Pending Registrations",
            path: "/clinics?status=pending",
            moduleKey: "clinics",
          },
        ],
      },
      {
        key: "subscription",
        name: "Subscription",
        icon: "CreditCard",
        moduleKey: "plans",
        path: "/plans",
        roles: ["super_admin"],
        items: [
          { key: "plans", name: "Plans", path: "/plans", moduleKey: "plans" },
          { key: "analytics", name: "Platform Analytics", path: "/analytics", moduleKey: "analytics" },
        ],
      },
    ],
  },
  {
    key: "patient-portal",
    label: "My Health",
    icon: "Heart",
    roles: ["patient"],
    groups: [
      {
        key: "patient-dashboard",
        name: "Dashboard",
        icon: "LayoutDashboard",
        moduleKey: "dashboard",
        items: [
          { key: "home", name: "Home", path: "", moduleKey: "dashboard" },
          { key: "appointments", name: "Appointments", path: "/appointments", moduleKey: "appointments" },
          { key: "queue", name: "Live Queue", path: "/queue", moduleKey: "queue" },
        ],
      },
      {
        key: "patient-records",
        name: "Records",
        icon: "FileHeart",
        moduleKey: "patients",
        path: "/patients",
        items: [
          { key: "my-records", name: "My Profile", path: "/patients", moduleKey: "patients" },
          { key: "my-rx", name: "Prescriptions", path: "/prescriptions", moduleKey: "prescriptions" },
          { key: "my-lab", name: "Lab Reports", path: "/lab", moduleKey: "lab" },
          { key: "my-pharmacy", name: "Pharmacy", path: "/pharmacy", moduleKey: "pharmacy" },
          { key: "my-followups", name: "Follow-ups", path: "/follow-ups", moduleKey: "patients" },
        ],
      },
      {
        key: "patient-billing",
        name: "Billing",
        icon: "Receipt",
        moduleKey: "billing",
        path: "/billing",
        items: [
          { key: "my-billing", name: "Invoices & Payments", path: "/billing", moduleKey: "billing" },
        ],
      },
      {
        key: "patient-teleconsult",
        name: "Teleconsult",
        icon: "Video",
        moduleKey: "teleconsult",
        path: "/teleconsult",
        items: [
          { key: "teleconsult", name: "Join Consultation", path: "/teleconsult", moduleKey: "teleconsult" },
        ],
      },
    ],
  },
];
