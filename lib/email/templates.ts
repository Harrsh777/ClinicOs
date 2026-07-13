const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function layout(content: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#0F172A,#1E293B);padding:20px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">ClinicOS</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">${content}</div>
  <p style="font-size:12px;color:#6b7280;margin-top:16px">© ClinicOS Platform</p>
</body></html>`;
}

export function applicationReceivedEmail(clinicName: string) {
  return layout(`
    <h2 style="margin-top:0">Application received</h2>
    <p>Thank you for applying to join MedERP with <strong>${clinicName}</strong>.</p>
    <p>Status: <strong>Pending Approval</strong></p>
    <p>Our team will review your application and notify you by email — usually within 1–2 business days.</p>
  `);
}

export function clinicApprovedEmail(params: {
  ownerName: string;
  clinicName: string;
  clinicCode: string;
  tempPassword: string;
  loginUrl?: string;
}) {
  const loginUrl = params.loginUrl ?? `${APP_URL}/login`;
  return layout(`
    <h2 style="margin-top:0">Welcome to ClinicOS!</h2>
    <p>Hi ${params.ownerName},</p>
    <p>Your clinic <strong>${params.clinicName}</strong> has been approved.</p>
    <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      <tr><td style="padding:4px 0;color:#6b7280">Clinic ID</td><td><strong>${params.clinicCode}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Temporary Password</td><td><strong>${params.tempPassword}</strong></td></tr>
    </table>
    <p><a href="${loginUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in to ClinicOS</a></p>
    <p style="font-size:13px;color:#6b7280">Sign in at <a href="${loginUrl}">${loginUrl}</a> using your Clinic ID and temporary password. You will be asked to set a new password on first login, then complete the setup wizard.</p>
    <p style="font-size:13px;color:#ef4444">For security, change your password immediately after first login.</p>
  `);
}

export function clinicRejectedEmail(clinicName: string, reason?: string) {
  return layout(`
    <h2 style="margin-top:0">Application update</h2>
    <p>Your clinic registration request for <strong>${clinicName}</strong> was not approved.</p>
    ${reason ? `<p><strong>Reason:</strong><br>${reason}</p>` : "<p>Unfortunately we are unable to approve your application at this time.</p>"}
    <p>If you have questions, reply to this email.</p>
  `);
}

export function staffActivationEmail(params: {
  staffName: string;
  clinicName: string;
  clinicCode: string;
  staffCode: string;
  role: string;
  activationUrl: string;
}) {
  return layout(`
    <h2 style="margin-top:0">You have been added to MedERP</h2>
    <p>Hi ${params.staffName},</p>
    <p>You have been added to <strong>${params.clinicName}</strong> as <strong>${params.role.replace(/_/g, " ")}</strong>.</p>
    <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      <tr><td style="padding:4px 0;color:#6b7280">Clinic ID</td><td><strong>${params.clinicCode}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Staff ID</td><td><strong>${params.staffCode}</strong></td></tr>
    </table>
    <p><a href="${params.activationUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Activate your account</a></p>
    <p style="font-size:13px;color:#6b7280">Set your own password when you activate. Login URL: <a href="${APP_URL}/login">${APP_URL}/login</a></p>
  `);
}

export function staffInviteEmail(params: {
  clinicName: string;
  clinicCode: string;
  role: string;
  inviteUrl: string;
}) {
  return layout(`
    <h2 style="margin-top:0">You're invited to join ${params.clinicName}</h2>
    <p>Your clinic administrator invited you to ClinicOS as <strong>${params.role.replace(/_/g, " ")}</strong>.</p>
    <table style="width:100%;background:#f8fafc;border-radius:12px;padding:16px;margin:16px 0;border:1px solid #e2e8f0">
      <tr><td style="padding:4px 0;color:#64748b">Clinic ID</td><td><strong>${params.clinicCode}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#64748b">Role</td><td><strong>${params.role.replace(/_/g, " ")}</strong></td></tr>
    </table>
    <p><a href="${params.inviteUrl}" style="display:inline-block;background:#0F172A;color:white;padding:12px 24px;border-radius:12px;text-decoration:none;font-weight:700">Accept invite</a></p>
    <p style="font-size:13px;color:#64748b">This invite expires in 7 days. After accepting, you can sign in at <a href="${APP_URL}/login">${APP_URL}/login</a>.</p>
  `);
}

export function passwordResetEmail(params: {
  name: string;
  clinicCode: string;
  staffCode: string;
  resetUrl: string;
}) {
  return layout(`
    <h2 style="margin-top:0">Password reset</h2>
    <p>Hi ${params.name},</p>
    <p>We received a request to reset your password for Clinic ID <strong>${params.clinicCode}</strong> / Staff ID <strong>${params.staffCode}</strong>.</p>
    <p><a href="${params.resetUrl}" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset password</a></p>
    <p style="font-size:13px;color:#6b7280">This link expires in 1 hour. If you did not request this, ignore this email.</p>
  `);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function row(label: string, value: string | null | undefined) {
  if (!value?.trim()) return "";
  return `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;width:140px">${escapeHtml(label)}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

export function demoRequestNotificationEmail(params: {
  clinicName: string;
  doctorName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  clinicType?: string | null;
  preferredDate: string;
  preferredTime: string;
  notes?: string | null;
  adminUrl?: string;
}) {
  const adminUrl = params.adminUrl ?? `${APP_URL}/admin/demo-requests`;
  return layout(`
    <h2 style="margin-top:0">New demo request</h2>
    <p>A visitor submitted the Book a Demo form on the Clinicos landing page.</p>
    <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      ${row("Clinic", params.clinicName)}
      ${row("Clinic type", params.clinicType)}
      ${row("Lead doctor", params.doctorName)}
      ${row("Contact person", params.contactName)}
      ${row("Email", params.email)}
      ${row("Mobile", params.phone)}
      ${row("Address", params.address)}
      ${row("City", params.city)}
      ${row("State", params.state)}
      ${row("Pincode", params.pincode)}
      ${row("Preferred date", params.preferredDate)}
      ${row("Preferred time", `${params.preferredTime} IST`)}
      ${row("Notes", params.notes)}
    </table>
    <p><a href="${adminUrl}" style="display:inline-block;background:#16C784;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">View in admin</a></p>
  `);
}
