"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  completeWhatsAppConnectAction,
  disconnectWhatsAppAction,
  initiateWhatsAppConnectAction,
  simulateWhatsAppConnectAction,
} from "@/lib/actions/whatsapp-connection";

interface WhatsAppConnectWizardProps {
  connected: boolean;
  connection: {
    display_phone_number: string;
    business_name: string | null;
    connection_status: string;
    quality_rating: string | null;
    connected_at: string | null;
    webhook_subscribed: boolean;
  } | null;
  metaConfigured: boolean;
  appId: string | null;
  configId: string | null;
}

interface EmbeddedSignupData {
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
  current_step?: string;
}

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function WhatsAppConnectWizard({
  connected,
  connection,
  metaConfigured,
  appId,
  configId,
}: WhatsAppConnectWizardProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const oauthStateRef = useRef<string | null>(null);
  const signupDataRef = useRef<EmbeddedSignupData>({});

  const handleEmbeddedSignupMessage = useCallback((event: MessageEvent) => {
    if (
      event.origin !== "https://www.facebook.com" &&
      event.origin !== "https://web.facebook.com"
    ) {
      return;
    }

    try {
      const data = JSON.parse(event.data as string) as {
        type?: string;
        event?: string;
        data?: EmbeddedSignupData;
      };

      if (data.type === "WA_EMBEDDED_SIGNUP") {
        if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA") {
          signupDataRef.current = data.data ?? {};
        }
      }
    } catch {
      // ignore non-JSON messages
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleEmbeddedSignupMessage);
    return () => window.removeEventListener("message", handleEmbeddedSignupMessage);
  }, [handleEmbeddedSignupMessage]);

  useEffect(() => {
    if (!appId || !sdkReady) return;

    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
    };
    window.fbAsyncInit();
  }, [appId, sdkReady]);

  async function handleConnect() {
    setLoading(true);
    setMessage(null);

    if (!metaConfigured || !appId || !configId) {
      const sim = await simulateWhatsAppConnectAction();
      setMessage(sim.error ?? "Demo WhatsApp connected (development mode)");
      setLoading(false);
      if (sim.success) window.location.reload();
      return;
    }

    const init = await initiateWhatsAppConnectAction();
    if (init.error || !init.state) {
      setMessage(init.error ?? "Failed to start connection");
      setLoading(false);
      return;
    }

    oauthStateRef.current = init.state;
    signupDataRef.current = {};

    if (!window.FB) {
      setMessage("Meta SDK not loaded. Please refresh and try again.");
      setLoading(false);
      return;
    }

    window.FB.login(
      (response) => {
        void (async () => {
          const code = response.authResponse?.code;
          const session = signupDataRef.current;

          if (!code) {
            setMessage("WhatsApp connection was cancelled or failed.");
            setLoading(false);
            return;
          }

          if (!session.phone_number_id || !session.waba_id) {
            setMessage("Missing WhatsApp account details from Meta. Please try again.");
            setLoading(false);
            return;
          }

          const result = await completeWhatsAppConnectAction({
            code,
            state: oauthStateRef.current!,
            wabaId: session.waba_id,
            phoneNumberId: session.phone_number_id,
            metaBusinessId: session.business_id,
          });

          if (result.error) {
            setMessage(result.error);
          } else {
            setMessage("WhatsApp connected successfully!");
            window.location.reload();
          }
          setLoading(false);
        })();
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
        },
      }
    );
  }

  async function handleDisconnect() {
    setLoading(true);
    const result = await disconnectWhatsAppAction();
    setMessage(result.error ?? "WhatsApp disconnected");
    setLoading(false);
    if (result.success) window.location.reload();
  }

  return (
    <>
      {appId && (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="lazyOnload"
          onLoad={() => setSdkReady(true)}
        />
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Meta Embedded Signup
            </div>
            <h3 className="text-lg font-semibold">Connect WhatsApp Business</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Connect your clinic&apos;s WhatsApp Business account in one click. ClinicOS
              automatically stores your credentials — no manual copying of Phone Number ID,
              WABA ID, or access tokens.
            </p>

            {!metaConfigured && (
              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Meta credentials are not configured yet. In development, you can use the demo
                connection to preview the inbox. Add <code>META_APP_ID</code>,{" "}
                <code>META_APP_SECRET</code>, and <code>META_CONFIG_ID</code> to enable live
                Embedded Signup.
              </p>
            )}

            {connected && connection && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm">
                <p className="font-semibold text-emerald-900">Connected</p>
                <p className="mt-1 text-emerald-800">
                  {connection.business_name ?? "WhatsApp Business"} ·{" "}
                  {connection.display_phone_number}
                </p>
                {connection.quality_rating && (
                  <p className="mt-1 text-emerald-700">
                    Quality: {connection.quality_rating}
                  </p>
                )}
                {connection.connected_at && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Connected {new Date(connection.connected_at).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-3">
            {!connected ? (
              <Button onClick={() => void handleConnect()} disabled={loading}>
                {loading ? "Connecting…" : metaConfigured ? "Connect with Meta" : "Connect (Demo)"}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => void handleDisconnect()} disabled={loading}>
                Disconnect
              </Button>
            )}
            {message && (
              <p className="max-w-xs text-sm text-[var(--text-secondary)]">{message}</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { step: "1", title: "Log in to Meta", desc: "Use your Facebook Business account" },
            { step: "2", title: "Select WABA", desc: "Choose or create a WhatsApp Business account" },
            { step: "3", title: "Verify number", desc: "Connect your clinic phone number" },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"
            >
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-white">
                {item.step}
              </div>
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
