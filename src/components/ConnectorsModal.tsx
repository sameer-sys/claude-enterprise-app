
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, LogOut, Plus, RefreshCw, ShieldCheck, X, Zap } from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

export interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  onAddCustomConnector?: (connector: Connector) => void;
  onResetConnectors?: () => void;
  sessionTitle?: string;
  sessionId?: string;
}

export const DEFAULT_CONNECTORS: Connector[] = [{
  id: 'conn-composio',
  name: 'Composio',
  description: 'One real connector for your connected apps, tools, OAuth accounts, and actions.',
  icon: 'composio',
  enabled: true,
  status: 'ready',
  category: 'Integrations',
  section: 'custom',
  isCustom: false,
  isVerified: true,
  provider: 'composio',
  capabilities: ['OAuth', 'Tool Router', 'Multi-account', 'Real-time Actions'],
  config: { connectionType: 'composio', providerName: 'Composio' },
  url: 'https://app.composio.dev/',
}];

export function createDefaultConnectors(): Connector[] {
  return DEFAULT_CONNECTORS.map(function (c) {
    return { ...c, config: { ...c.config } };
  });
}

interface ComposioAccount {
  id: string;
  appUniqueId: string;
  appName?: string;
  status: string;
  email?: string;
  accountIdentifier?: string;
  alias?: string;
}

const SERVICE_OPTIONS = [
  ['github', 'GitHub'], ['gmail', 'Gmail'], ['google_drive', 'Google Drive'],
  ['google_calendar', 'Google Calendar'], ['youtube', 'YouTube'], ['slack', 'Slack'],
  ['notion', 'Notion'], ['microsoft365', 'Microsoft 365'], ['instagram', 'Instagram'],
  ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['linear', 'Linear'],
  ['asana', 'Asana'], ['canva', 'Canva'], ['hubspot', 'HubSpot'],
] as const;

function serviceLabel(slug: string): string {
  const found = SERVICE_OPTIONS.find(function (item) { return item[0] === slug; });
  return found ? found[1] : slug.replace(/_/g, ' ');
}

export default function ConnectorsModal(props: ConnectorsModalProps) {
  const { isOpen, onClose, onUpdateConnectorConfig } = props;
  const [accounts, setAccounts] = useState<ComposioAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showServices, setShowServices] = useState(true);

  const activeAccounts = useMemo(function () {
    return accounts.filter(function (a) { return String(a.status).toUpperCase() === 'ACTIVE'; });
  }, [accounts]);

  const refresh = async function (silent?: boolean) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/composio', { cache: 'no-store' });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not read Composio status.');
      const next = Array.isArray(data.connectedAccounts) ? data.connectedAccounts : [];
      setAccounts(next);
      const active = next.filter(function (a: ComposioAccount) { return String(a.status).toUpperCase() === 'ACTIVE'; }) as ComposioAccount[];
      onUpdateConnectorConfig && onUpdateConnectorConfig('conn-composio', {
        connectionType: 'composio',
        providerName: 'Composio',
        composioUserId: data.userId,
        composioAccountCount: active.length,
        connectedAccountIds: active.map(function (a) { return a.id; }),
      });
      if (data.apiKeyConfigured === false) setError('Composio is not configured on the server. Add COMPOSIO_API_KEY in Vercel.');
    } catch (e: any) {
      setError(e && e.message ? e.message : 'Could not load Composio accounts.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(function () {
    if (!isOpen) return;
    refresh();
    const onFocus = function () { refresh(true); };
    window.addEventListener('focus', onFocus);
    return function () { window.removeEventListener('focus', onFocus); };
  }, [isOpen]);

  const connectService = async function (service: string) {
    setConnecting(service);
    setError('');
    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          appName: service,
          callbackUrl: window.location.origin + '/api/composio/callback',
        }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || !data.redirectUrl) throw new Error(data.error || 'Composio could not create the login link.');

      const popup = window.open(data.redirectUrl, 'sameer_composio_connect', 'popup,width=620,height=780,resizable=yes,scrollbars=yes');
      if (!popup) {
        window.location.href = data.redirectUrl;
        return;
      }

      let tries = 0;
      const timer = window.setInterval(async function () {
        tries += 1;
        if (popup.closed || tries > 120) {
          window.clearInterval(timer);
          setConnecting(null);
          refresh(true);
          return;
        }
        try {
          const statusRes = await fetch('/api/composio', { cache: 'no-store' });
          const statusData = await statusRes.json().catch(function () { return {}; });
          const live = Array.isArray(statusData.connectedAccounts) ? statusData.connectedAccounts : [];
          setAccounts(live);
          const found = live.some(function (a: ComposioAccount) {
            return String(a.status).toUpperCase() === 'ACTIVE' && String(a.appUniqueId).toLowerCase() === service.toLowerCase();
          });
          if (found) {
            window.clearInterval(timer);
            setConnecting(null);
            refresh(true);
          }
        } catch {}
      }, 1500);
    } catch (e: any) {
      setConnecting(null);
      setError(e && e.message ? e.message : 'Connection failed.');
    }
  };

  const disconnectService = async function (accountId: string) {
    setError('');
    try {
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', connectedAccountId: accountId }),
      });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok || data.success === false) throw new Error(data.error || 'Disconnect failed.');
      refresh();
    } catch (e: any) {
      setError(e && e.message ? e.message : 'Disconnect failed.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={function (e) { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2d2b25]">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#cc785c]" />
            <h2 className="text-base font-semibold">Connectors</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#292721]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="grid grid-cols-3 text-xs text-[#8f8a80] pb-2 border-b border-[#2d2b25]">
            <div>Connector</div>
            <div>Type</div>
            <div className="text-right">Status</div>
          </div>
          <div className="grid grid-cols-3 items-center py-3">
            <div className="flex items-center gap-2 font-medium">
              <Zap className="w-4 h-4 text-[#cc785c]" />
              <span>composio</span>
            </div>
            <div className="text-xs">
              <span className="px-2 py-0.5 rounded-full border border-[#4a463d] text-[#b8b2a7]">Web Custom</span>
            </div>
            <div className="flex justify-end">
              {activeAccounts.length ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#666158]" />
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-4 rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
