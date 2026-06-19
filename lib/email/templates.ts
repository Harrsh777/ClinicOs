const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function layout(content: string) {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#1a1a2e;max-width:560px;margin:0 auto;padding:24px">
  <div style="background:linear-gradient(135deg,#0d9488,#6366f1);padding:20px;border-radius:12px 12px 0 0">
    <h1 style="color:white;margin:0;font-size:20px">ClinicOS</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px">${content}</div>
  <p style="font-size:12px;color:#6b7280;margin-top:16px">© ClinicOS Platform</p>
</body></html>`;
}

export function applicationReceivedEmail(clinicName: string) {
  return layout(`
    <h2 style="margin-top:0">Application received</h2>
    <p>Thank you for applying to join ClinicOS with <strong>${clinicName}</strong>.</p>
    <p>Our team will review your application and email your login credentials once approved — usually within 1–2 business days.</p>
  `);
}

export function clinicApprovedEmail(params: {
  ownerName: string;
  clinicName: string;
  clinicCode: string;
  email: string;
  password: string;
}) {
  return layout(`
    <h2 style="margin-top:0">Welcome to ClinicOS!</h2>
    <p>Hi ${params.ownerName},</p>
    <p>Your clinic <strong>${params.clinicName}</strong> has been approved. Use these credentials to sign in:</p>
    <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      <tr><td style="padding:4px 0;color:#6b7280">Clinic ID</td><td><strong>${params.clinicCode}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Email</td><td><strong>${params.email}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Password</td><td><strong>${params.password}</strong></td></tr>
    </table>
    <p><a href="${APP_URL}/login" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in to your dashboard</a></p>
    <p style="font-size:13px;color:#6b7280">Please change your password after first login. You can invite doctors and receptionists from Staff Management.</p>
  `);
}

export function clinicRejectedEmail(clinicName: string, reason?: string) {
  return layout(`
    <h2 style="margin-top:0">Application update</h2>
    <p>Thank you for your interest in ClinicOS for <strong>${clinicName}</strong>.</p>
    <p>Unfortunately we are unable to approve your application at this time.${reason ? ` Reason: ${reason}` : ""}</p>
    <p>If you have questions, reply to this email.</p>
  `);
}

export function staffCredentialsEmail(params: {
  staffName: string;
  clinicName: string;
  clinicCode: string;
  email: string;
  password: string;
  role: string;
}) {
  return layout(`
    <h2 style="margin-top:0">Your ClinicOS account</h2>
    <p>Hi ${params.staffName},</p>
    <p>You have been added to <strong>${params.clinicName}</strong> as <strong>${params.role.replace(/_/g, " ")}</strong>.</p>
    <table style="width:100%;background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
      <tr><td style="padding:4px 0;color:#6b7280">Clinic ID</td><td><strong>${params.clinicCode}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Email</td><td><strong>${params.email}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#6b7280">Password</td><td><strong>${params.password}</strong></td></tr>
    </table>
    <p><a href="${APP_URL}/login" style="display:inline-block;background:#0d9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Sign in</a></p>
  `);
}
