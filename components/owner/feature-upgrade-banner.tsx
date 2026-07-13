import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkles, Video, TrendingUp, Palette, Pill, FlaskConical } from "lucide-react";
import type { ClinicFeatureKey } from "@/lib/clinic/features";

const FEATURE_INFO: Record<
  string,
  { title: string; description: string; icon: ReactNode; planRequired: string }
> = {
  teleconsult: {
    title: "Teleconsult",
    description:
      "Run video consultations with Google Meet integration. Send meeting links via WhatsApp and manage sessions from the doctor dashboard.",
    icon: <Video className="h-5 w-5" />,
    planRequired: "Pro",
  },
  ai_insights: {
    title: "AI Insights",
    description: "AI-powered clinic analytics, patient risk scoring, and operational recommendations.",
    icon: <Sparkles className="h-5 w-5" />,
    planRequired: "Enterprise",
  },
  analytics: {
    title: "Revenue Analytics",
    description: "Advanced revenue dashboards, trends, and financial reporting.",
    icon: <TrendingUp className="h-5 w-5" />,
    planRequired: "Pro",
  },
  white_label: {
    title: "White Label & Branding",
    description: "Custom logo, theme colors, and branded patient portal.",
    icon: <Palette className="h-5 w-5" />,
    planRequired: "Enterprise",
  },
  pharmacy: {
    title: "Pharmacy Module",
    description: "Medicine inventory, dispensing, and pharmacy workflows.",
    icon: <Pill className="h-5 w-5" />,
    planRequired: "Pro",
  },
  lab: {
    title: "Lab Module",
    description: "Lab test catalog, orders, and result management.",
    icon: <FlaskConical className="h-5 w-5" />,
    planRequired: "Pro",
  },
};

interface FeatureUpgradeBannerProps {
  feature: ClinicFeatureKey;
  currentPlan: string | null;
}

export function FeatureUpgradeBanner({ feature, currentPlan }: FeatureUpgradeBannerProps) {
  const info = FEATURE_INFO[feature];
  if (!info) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          {info.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            Upgrade to unlock {info.title}
          </h3>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{info.description}</p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
            Requires <strong>{info.planRequired}</strong> plan
            {currentPlan ? ` · You are on ${currentPlan}` : ""}.
          </p>
          <div className="mt-3 flex gap-3">
            <a
              href="mailto:support@clinicos.app?subject=Upgrade%20request"
              className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Contact us to upgrade
            </a>
            <Link
              href="/owner/settings"
              className="inline-flex items-center rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200"
            >
              Learn more
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
