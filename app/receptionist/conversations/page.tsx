import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { ConversationsInbox } from "@/components/conversations/conversations-inbox";
import { getConversationsInboxAction } from "@/lib/actions/conversations";
import { getWhatsAppConnectionStatusAction } from "@/lib/actions/whatsapp-connection";

export default async function ReceptionistConversationsPage() {
  await requireRole(["receptionist"]);
  const [{ conversations }, status] = await Promise.all([
    getConversationsInboxAction(),
    getWhatsAppConnectionStatusAction(),
  ]);

  return (
    <div>
      <PageHeader
        title="Conversations"
        subtitle="Reply to patient WhatsApp messages and manage inquiries"
      />

      {!status.connected && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          WhatsApp is not connected yet. Ask your clinic owner to connect WhatsApp in Settings →
          Conversations.
        </div>
      )}

      <ConversationsInbox
        initialConversations={conversations}
        connected={status.connected}
        basePath="/receptionist"
      />
    </div>
  );
}
