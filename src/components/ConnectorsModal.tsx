
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, KeyRound, Loader2, LogOut, Plus, RefreshCw, Settings, ShieldCheck, X, Zap } from 'lucide-react';
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

function getUserId(): string {
  if (typeof window === 'undefined') return 'sameer-web-user';
  const key = 'sameer_composio_user_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const generated = 'sameer_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  localStorage.setItem(key, generated);
  return generated;
}

function serviceLabel(slug: string): string {
  const found = SERVICE_OPTIONS.find(function (item) { return item[0] === slug; });
  return found ? found[1] : slug.replace(/_/g, ' ');
}

export default function ConnectorsModal(props: ConnectorsModalProps) {
  const { isOpen, onClose, activeConnectors, onUpdateConnectorConfig } = props;
  const [accounts, setAccounts] = useState<ComposioAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [showServices, setShowServices] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedKey, setSavedKey] = useState(false);

  const activeAccounts = useMemo(function () {
    return accounts.filter(function (a) { return String(a.status).toUpperCase() === 'ACTIVE'; });
  }, [accounts]);

  const refresh = async function (silent?: boolean) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const userId = getUserId();
      const key = typeof window !== 'undefined' ? localStorage.getItem('composio_api_key') || '' : '';
      const q = new URLSearchParams({ entityId: userId });
      if (key) q.set('apiKey', key);
      const res = await fetch('/api/composio?' + q.toString(), { cache: 'no-store' });
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not read Composio status.');
      const next = Array.isArray(data.connectedAccounts) ? data.connectedAccounts : [];
      setAccounts(next);
      const active = next.filter(function (a: ComposioAccount) { return String(a.status).toUpperCase() === 'ACTIVE'; });
      onUpdateConnectorConfig && onUpdateConnectorConfig('conn-composio', {
        connectionType: 'composio',
        providerName: 'Composio',
        composioUserId: userId,
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
    setApiKey(typeof window !== 'undefined' ? localStorage.getItem('composio_api_key') || '' : '');
    refresh();
    const onFocus = function () { refresh(true); };
    window.addEventListener('focus', onFocus);
    return function () { window.removeEventListener('focus', onFocus); };
  }, [isOpen]);

  const saveKey = function () {
    if (typeof window !== 'undefined') localStorage.setItem('composio_api_key', apiKey.trim());
    setSavedKey(true);
    setTimeout(function () { setSavedKey(false); }, 1800);
    refresh();
  };

  const connectService = async function (service: string) {
    setConnecting(service);
    setError('');
    try {
      const userId = getUserId();
      const key = typeof window !== 'undefined' ? localStorage.getItem('composio_api_key') || '' : '';
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          appName: service,
          apiKey: key || undefined,
          entityId: userId,
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
          const q = new URLSearchParams({ entityId: userId });
          const currentKey = localStorage.getItem('composio_api_key') || '';
          if (currentKey) q.set('apiKey', currentKey);
          const statusRes = await fetch('/api/composio?' + q.toString(), { cache: 'no-store' });
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
      const key = typeof window !== 'undefined' ? localStorage.getItem('composio_api_key') || '' : '';
      const res = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disconnect', connectedAccountId: accountId, apiKey: key || undefined }),
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
      <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-3xl border border-[#38352d] bg-[#181714] text-[#ece9e2] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#2d2b25]">
          <div>
            <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-[#cc785c]" /><h2 className="text-lg font-semibold">Connectors</h2></div>
            <p className="text-xs text-[#8f8a80] mt-1">One connector: Composio. Your real connected apps live inside it.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#292721]"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto max-h-[calc(88vh-80px)] p-5 space-y-4">
          <div className="rounded-2xl border border-[#3a362e] bg-[#1d1b17] p-5">
            <div className="flex items-start justify-between">
              <div className="flex gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#28241f] flex items-center justify-center"><Zap className="w-6 h-6 text-[#cc785c]" /></div>
                <div>
                  <div className="flex items-center gap-2"><h3 className="font-semibold">Composio</h3><span className="text-[10px] px-2 py-1 rounded-full border border-[#4a463d] text-[#b8b2a7]">REAL RUNTIME</span></div>
                  <p className="text-xs text-[#8f8a80] mt-1">OAuth, connected accounts, tool discovery, and execution all come from the same Composio project.</p>
                </div>
              </div>
              <button onClick={function () { refresh(); }} className="p-2 rounded-xl border border-[#38352d] hover:bg-[#292721]"><RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /></button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-[#141310] border border-[#292720] px-4 py-3">
              <div><div className="text-xs text-[#8f8a80]">Authorization</div><div className="font-medium mt-0.5">{activeAccounts.length ? 'Connected - ' + activeAccounts.length + ' active account' + (activeAccounts.length === 1 ? '' : 's') : 'Not connected'}</div></div>
              <div className={activeAccounts.length ? 'w-3 h-3 rounded-full bg-emerald-400' : 'w-3 h-3 rounded-full bg-[#666158]'} />
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-900/50 bg-red-950/20 px-4 py-3 text-xs text-red-200">{error}</div>}

          <div className="rounded-2xl border border-[#302e27] bg-[#1b1916] overflow-hidden">
            <button onClick={function () { setShowServices(!showServices); }} className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#211f1b]">
              <div><div className="font-medium text-sm">Your connected apps</div><div className="text-xs text-[#8f8a80] mt-1">These are the ACTIVE Composio accounts the chat can actually use.</div></div>
              <Plus className={showServices ? 'w-4 h-4 rotate-45' : 'w-4 h-4'} />
            </button>
            {showServices && <div className="border-t border-[#302e27] p-4 space-y-2">
              {activeAccounts.map(function (account) {
                return <div key={account.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#332f28] bg-[#141310] px-3 py-3">
                  <div className="min-w-0"><div className="text-sm font-medium">{serviceLabel(account.appUniqueId)}</div><div className="text-xs text-[#858077] truncate">{account.email || account.accountIdentifier || account.alias || account.id}</div></div>
                  <button onClick={function () { disconnectService(account.id); }} className="p-2 rounded-lg hover:bg-red-950/30 text-[#99938a]" title="Disconnect"><LogOut className="w-4 h-4" /></button>
                </div>;
              })}
              {!activeAccounts.length && <div className="text-xs text-[#777269] py-2">No active accounts yet.</div>}
              <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICE_OPTIONS.map(function (item) {
                  const id = item[0]; const label = item[1];
                  const connected = activeAccounts.some(function (a) { return String(a.appUniqueId).toLowerCase() === id; });
                  return <button key={id} disabled={Boolean(connecting)} onClick={function () { connectService(id); }} className="rounded-xl border border-[#353129] bg-[#211f1b] hover:bg-[#292721] disabled:opacity-50 px-3 py-2.5 text-left">
                    <div className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{label}</span>{connected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : connecting === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-[#777269]" />}</div>
                  </button>;
                })}
              </div>
            </div>}
          </div>

          <div className="rounded-2xl border border-[#302e27] bg-[#1b1916] p-5">
            <div className="flex items-center gap-2 mb-2"><ShieldCheck className="w-4 h-4 text-[#aaa49a]" /><span className="text-sm font-medium">Real authentication</span></div>
            <p className="text-xs leading-5 text-[#89837a]">Click an app above and Composio opens its hosted authentication flow. You sign in with Google, GitHub, or the provider itself. The chat only treats an account as connected after Composio reports it ACTIVE.</p>
          </div>

          <details className="rounded-2xl border border-[#302e27] bg-[#1b1916]">
            <summary className="cursor-pointer list-none px-5 py-4 flex items-center gap-2 text-sm font-medium"><Settings className="w-4 h-4" /> Project configuration</summary>
            <div className="px-5 pb-5 pt-1">
              <div className="text-xs text-[#89837a] mb-3">For Vercel, set COMPOSIO_API_KEY as a server environment variable. This local key is only a fallback.</div>
              <div className="flex gap-2">
                <input value={apiKey} onChange={function (e) { setApiKey(e.target.value); }} type={showKey ? 'text' : 'password'} placeholder="Composio API key" className="flex-1 rounded-xl bg-[#12110f] border border-[#38352d] px-3 py-2.5 text-xs outline-none" />
                <button onClick={function () { setShowKey(!showKey); }} className="p-2 rounded-xl border border-[#38352d]"><KeyRound className="w-4 h-4" /></button>
                <button onClick={saveKey} className="px-3 rounded-xl bg-[#cc785c] text-black text-xs font-semibold">{savedKey ? 'Saved' : 'Save'}</button>
              </div>
            </div>
          </details>

          <div className="text-[11px] text-[#6f6a61] text-center">The local Enabled state is not proof of authorization. Chat access comes from the same Composio user ID and ACTIVE accounts shown above.</div>
        </div>
      </div>
    </div>
  );
}
