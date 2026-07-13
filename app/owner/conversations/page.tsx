import { requireRole } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/card";
import { WhatsAppConnectWizard } from "@/components/conversations/whatsapp-connect-wizard";
import { ConversationsInbox } from "@/components/conversations/conversations-inbox";
import { getConversationsInboxAction } from "@/lib/actions/conversations";
import { getWhatsAppConnectionStatusAction } from "@/lib/actions/whatsapp-connection";

export default async function OwnerConversationsPage() {
  await requireRole(["clinic_owner"]);
  const [{ conversations, connection }, status] = await Promise.all([
    getConversationsInboxAction(),
    getWhatsAppConnectionStatusAction(),
  ]);

  return (
    <div>
      <PageHeader
        title="Conversations"
        subtitle="Unified WhatsApp inbox — patient messages, appointment bookings, and staff replies"
      />

      <div className="mb-6">
        <WhatsAppConnectWizard
          connected={status.connected}
          connection={connection}
          metaConfigured={status.metaConfigured}
          appId={status.appId}
          configId={status.configId}
        />
      </div>

      <ConversationsInbox
        initialConversations={conversations}
        connected={status.connected}
        basePath="/owner"
      />
    </div>
  );
}
