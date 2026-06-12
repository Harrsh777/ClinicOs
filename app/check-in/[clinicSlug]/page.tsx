import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CheckInClient } from "@/components/queue/check-in-client";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, slug, logo_url")
    .eq("slug", clinicSlug)
    .eq("status", "active")
    .single();

  if (!clinic) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let patientId: string | null = null;

  if (user) {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    patientId = patient?.id ?? null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface-1)] flex items-center justify-center p-4">
      <CheckInClient clinic={clinic} patientId={patientId} isLoggedIn={!!user} />
    </div>
  );
}
