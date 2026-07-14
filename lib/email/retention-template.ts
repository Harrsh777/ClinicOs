function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function plainTextToEmailHtml(text: string) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 14px;line-height:1.6">${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function buildRetentionEmailHtml(params: {
  clinicName: string;
  patientName: string;
  bodyHtml: string;
  inlineImageCids?: string[];
}) {
  const inlineImages = (params.inlineImageCids ?? [])
    .map(
      (cid) =>
        `<p style="margin:16px 0 0"><img src="cid:${cid}" alt="Attachment" style="max-width:100%;border-radius:8px" /></p>`
    )
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">
      <div style="border-bottom:3px solid #0d9488;padding-bottom:12px;margin-bottom:20px">
        <h2 style="margin:0;color:#0d9488;font-size:20px">${escapeHtml(params.clinicName)}</h2>
      </div>
      <p style="margin:0 0 16px;line-height:1.6">Dear ${escapeHtml(params.patientName)},</p>
      <div style="font-size:15px">${params.bodyHtml}</div>
      ${inlineImages}
      <p style="margin:24px 0 0;font-size:12px;color:#6b7280;line-height:1.5">
        This message was sent by ${escapeHtml(params.clinicName)} via ClinicOS.
        Please reply to this email if you have questions about your care.
      </p>
    </div>
  `;
}
