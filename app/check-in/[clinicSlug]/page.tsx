import { redirect } from "next/navigation";

export default async function LegacyCheckInRedirect({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  redirect(`/c/${clinicSlug}/check-in`);
}
