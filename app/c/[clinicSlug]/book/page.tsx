import { redirect } from "next/navigation";

export default async function PortalBookRedirect({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  redirect(`/c/${clinicSlug}/bookings`);
}
