import { Resend } from "resend";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "ClinicOS <onboarding@clinicos.app>";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export type EmailAttachmentInput = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
  contentId?: string;
};

export type SendEmailResult = { ok: true; id?: string } | { ok: false; error: string };

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  attachments?: EmailAttachmentInput[];
}): Promise<SendEmailResult> {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — skipping send to", params.to);
    return { ok: false, error: "Email not configured (RESEND_API_KEY missing)" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: params.from ?? FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
        contentId: attachment.contentId,
      })),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Send failed" };
  }
}
