'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Plus, RefreshCw, Search, Settings, X, Zap } from 'lucide-react';
import { Connector, ConnectorConfig } from '@/types/chat';

export type { Connector, ConnectorConfig };

interface ConnectorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConnectors: Connector[];
  onToggleConnector: (id: string) => void;
  onUpdateConnectorConfig?: (id: string, config: ConnectorConfig) => void;
  onAddCustomConnector?: (conn: Connector) => void;
  sessionTitle?: string;
  onResetConnectors?: () => void;
  sessionId?: string;
}

type ComposioAccount = {
  id: string;
  appUniqueId?: string;
  appName?: string;
  status?: string;
  email?: string;
  accountIdentifier?: string;
  label?: string;
  alias?: string;
};

const APP_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  google_drive: 'Google Drive',
  google_calendar: 'Google Calendar',
  github: 'GitHub',
  youtube: 'YouTube',
  slack: 'Slack',
  notion: 'Notion',
  microsoft365: 'Microsoft 365',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  linear: 'Linear',
  asana: 'Asana',
  canva: 'Canva',
  hubspot: 'HubSpot',
  salesforce: 'Salesforce',
  shopify: 'Shopify',
  reddit: 'Reddit',
  discord: 'Discord',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
};

function getStableComposioUserId(): string {
  if (typeof window === 'undefined') return 'sameer-web-user';

  const key = 'sameer_composio_user_id';
  const existing = window.localStorage.getItem(key);
  if (existing?.trim()) return existing.trim();

  const generated =
    typeof window.crypto?.randomUUID === 'function'
      ? 'sameer_' + window.crypto.randomUUID()
      : 'sameer_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  window.localStorage.setItem(key, generated);
  return generated;
}

function getAccountToolkit(account: ComposioAccount): string {
  return String(account.appUniqueId || account.appName || '').toLowerCase();
}

function getAccountLabel(account: ComposioAccount): string {
  return String(
    account.email ||
      account.accountIdentifier ||
      account.alias ||
      account.label ||
      account.id ||
      'Connected account'
  );
}

export function createDefaultConnectors(): Connector[] {
  return [
    {
      id: 'conn-composio',
      name: 'Composio',
      description: 'Connect your external apps and let the chat discover and execute real Composio tools.',
      icon: 'composio',
      enabled: true,
      status: 'ready',
      category: 'Developer Tools',
      section: 'top',
      isVerified: true,
      isCustom: false,
      capabilities: [
        'Live app authorization',
        'Tool discovery',
        'Real tool execution',
        'Multiple accounts per app',
      ],
      config: {
        connectionType: 'composio',
        providerName: 'Composio',
        endpoint: 'https://backend.composio.dev/api/v3.1',
      },
      url: 'https://composio.dev/',
    },
  ];
}

export const DEFAULT_CONNECTORS: Connector[] = createDefaultConnectors();

export default function ConnectorsModal({
  isOpen,
  onClose,
  activeConnectors,
  onToggleConnector,
  onUpdateConnectorConfig,
  sessionTitle,
  onResetConnectors,
}: ConnectorsModalProps) {
  const composioConnector = activeConnectors.find((connector) => connector.id === 'conn-composio') || DEFAULT_CONNECTORS[0];
  const [accounts, setAccounts] = useState<ComposioAccount[]>([]);
  const [supportedApps, setSupportedApps] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHubOpen, setIsHubOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const activeAccounts = useMemo(
    () => accounts.filter((account) => String(account.status || '').toUpperCase() === 'ACTIVE'),
    [accounts]
  );

  const normalizedApps = useMemo(() => {
    const fromApi = supportedApps.map((value) => String(value).toLowerCase()).filter(Boolean);
    const fromAccounts = activeAccounts.map(getAccountToolkit).filter(Boolean);
    return Array.from(new Set([...fromApi, ...fromAccounts])).sort();
  }, [supportedApps, activeAccounts]);

  const visibleApps = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return normalizedApps;
    return normalizedApps.filter((slug) =>
      slug.includes(query) || (APP_LABELS[slug] || slug).toLowerCase().includes(query)
    );
  }, [normalizedApps, searchQuery]);

  const loadAccounts = async () => {
    if (typeof window === 'undefined') return;

    setLoading(true);
    setErrorMessage('');

    try {
      const userId = getStableComposioUserId();
      const browserApiKey = window.localStorage.getItem('composio_api_key') || '';
      const params = new URLSearchParams({ entityId: userId });
      if (browserApiKey) params.set('apiKey', browserApiKey);

      const response = await fetch('/api/composio?' + params.toString(), {
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load Composio connections.');
      }

      const nextAccounts = Array.isArray(data?.connectedAccounts) ? data.connectedAccounts : [];
      setAccounts(nextAccounts);
      setSupportedApps(Array.isArray(data?.supportedApps) ? data.supportedApps : []);

      const activeCount = nextAccounts.filter(
        (account: ComposioAccount) => String(account.status || '').toUpperCase() === 'ACTIVE'
      ).length;

      onUpdateConnectorConfig?.('conn-composio', {
        connectionType: 'composio',
        providerName: 'Composio',
        composioAccountCount: activeCount,
        composioToolkits: nextAccounts
          .filter((account: ComposioAccount) => String(account.status || '').toUpperCase() === 'ACTIVE')
          .map(getAccountToolkit)
          .filter(Boolean),
      });

      setStatusMessage(
        activeCount
          ? activeCount + ' active app account' + (activeCount === 1 ? '' : 's')
          : 'No active app accounts yet'
      );
    } catch (error: any) {
      setErrorMessage(error?.message || 'Composio connection lookup failed.');
      setStatusMessage('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    loadAccounts();

    const onFocus = () => loadAccounts();
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      if (event.data?.type === 'sameer-composio-connected') {
        setIsHubOpen(true);
        setStatusMessage(
          event.data?.status === 'success'
            ? 'OAuth finished. Refreshing live Composio accounts…'
            : 'OAuth was not completed.'
        );
        loadAccounts();
      }
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('message', onMessage);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('message', onMessage);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectApp = async (toolkit: string) => {
    if (connecting) return;

    setConnecting(toolkit);
    setErrorMessage('');
    setStatusMessage('Creating a fresh Composio authorization link…');

    let popup: Window | null = null;

    try {
      popup = window.open(
        'about:blank',
        'sameer_composio_connect',
        'popup,width=680,height=800,resizable=yes,scrollbars=yes'
      );

      const browserApiKey = window.localStorage.getItem('composio_api_key') || '';
      const response = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          appName: toolkit,
          entityId: getStableComposioUserId(),
          ...(browserApiKey ? { apiKey: browserApiKey } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.redirectUrl) {
        throw new Error(data?.error || 'Composio did not return an authorization link.');
      }

      setStatusMessage('Opening ' + (APP_LABELS[toolkit] || toolkit) + ' authorization…');

      if (popup && !popup.closed) {
        popup.location.href = data.redirectUrl;
      } else {
        window.location.href = data.redirectUrl;
        return;
      }

      let attempts = 0;
      const poller = window.setInterval(async () => {
        attempts += 1;

        if (attempts > 60 || popup?.closed) {
          window.clearInterval(poller);
          setConnecting(null);
          await loadAccounts();
          return;
        }

        try {
          const check = await fetch(
            '/api/composio?entityId=' + encodeURIComponent(getStableComposioUserId()) +
              (browserApiKey ? '&apiKey=' + encodeURIComponent(browserApiKey) : ''),
            { cache: 'no-store' }
          );
          const checkData = await check.json().catch(() => ({}));
          if (!check.ok) return;

          const next = Array.isArray(checkData?.connectedAccounts) ? checkData.connectedAccounts : [];
          setAccounts(next);

          const matches = next.some(
            (account: ComposioAccount) =>
              String(account.status || '').toUpperCase() === 'ACTIVE' &&
              getAccountToolkit(account) === toolkit.toLowerCase()
          );

          if (matches) {
            window.clearInterval(poller);
            setConnecting(null);
            setStatusMessage((APP_LABELS[toolkit] || toolkit) + ' is connected and available to the chat.');
            await loadAccounts();
          }
        } catch {}
      }, 1500);
    } catch (error: any) {
      if (popup && !popup.closed) popup.close();
      setErrorMessage(error?.message || 'Failed to start Composio OAuth.');
      setStatusMessage('');
      setConnecting(null);
    }
  };

  const handleDisconnectApp = async (account: ComposioAccount) => {
    setErrorMessage('');
    const confirmed = window.confirm(
      'Remove the ' + getAccountLabel(account) + ' connection from Composio?'
    );
    if (!confirmed) return;

    try {
      const response = await fetch('/api/composio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disconnect',
          connectedAccountId: account.id,
          entityId: getStableComposioUserId(),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || 'Unable to disconnect the Composio account.');
      }

      setStatusMessage('Connection removed.');
      await loadAccounts();
    } catch (error: any) {
      setErrorMessage(error?.message || 'Failed to disconnect the account.');
    }
  };

  const openComposioDashboard = () => {
    window.open('https://app.composio.dev/apps', '_blank', 'noopener,noreferrer');
  };

  const activeNames = activeAccounts
    .map((account) => APP_LABELS[getAccountToolkit(account)] || getAccountToolkit(account))
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#191816] border border-[#2b2923] shadow-2xl text-[#f2eee6] flex flex-col">
        <div className="px-5 sm:px-7 py-5 border-b border-[#292720] flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-medium">Customize</h1>
            <p className="text-xs text-[#8a8579] mt-1">
              {sessionTitle || 'Current chat'} · one connector, real external tools
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#8a8579] hover:text-white hover:bg-[#282622]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-7 py-4 border-b border-[#24231e] flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#282622] text-xs font-semibold">Connectors</div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#cc785c]/10 border border-[#cc785c]/20 text-[#cc785c]">
              {activeNames.length ? activeNames.join(' · ') : 'No apps connected'}
            </span>
            <button
              type="button"
              onClick={loadAccounts}
              disabled={loading}
              className="p-2 rounded-xl text-[#8a8579] hover:text-white hover:bg-[#282622] disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
          <div className="rounded-2xl border border-[#38352d] bg-[#1e1c19] p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#12110f] border border-[#2d2a23] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#cc785c]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Composio</h2>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      LIVE RUNTIME
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8a8579] mt-1">
                    {statusMessage || 'Authorize an app and the chat can use its real Composio tools.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openComposioDashboard}
                  className="px-3 py-2 rounded-xl bg-[#292721] hover:bg-[#333129] border border-[#3d3b31] text-xs text-[#dcd8ce] inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setIsHubOpen(true)}
                  className="px-3 py-2 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black text-xs font-semibold"
                >
                  {activeAccounts.length ? 'Manage apps' : 'Connect an app'}
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
              <div className="p-3 rounded-xl bg-[#151411] border border-[#2a2821]">
                <div className="font-semibold text-[#dcd8ce]">Same user identity</div>
                <div className="text-[#777268] mt-1 font-mono break-all">{getStableComposioUserId()}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#151411] border border-[#2a2821]">
                <div className="font-semibold text-[#dcd8ce]">Connected accounts</div>
                <div className="text-[#777268] mt-1">{activeAccounts.length}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#151411] border border-[#2a2821]">
                <div className="font-semibold text-[#dcd8ce]">Chat tool path</div>
                <div className="text-emerald-400 mt-1">Search → execute → real result</div>
              </div>
            </div>
          </div>

          {activeAccounts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Connected accounts</h3>
                <span className="text-[10px] text-[#6d685e]">Live from Composio</span>
              </div>

              <div className="space-y-2">
                {activeAccounts.map((account) => {
                  const toolkit = getAccountToolkit(account);
                  return (
                    <div key={account.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#2d2b24] bg-[#1b1a17] px-4 py-3">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{APP_LABELS[toolkit] || toolkit}</div>
                        <div className="text-[10px] text-emerald-400 font-mono truncate mt-1">
                          {getAccountLabel(account)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          ACTIVE
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDisconnectApp(account)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#292721] hover:bg-[#352f2a] border border-[#3d3b31] text-[10px] text-[#dcd8ce]"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#141310] border border-[#2b2923]">
            <Search className="w-4 h-4 text-[#6d685e]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search Composio apps"
              className="flex-1 bg-transparent text-xs text-[#f2eee6] placeholder-[#6d685e] outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Apps available through Composio</h3>
              <span className="text-[10px] text-[#6d685e]">{visibleApps.length} shown</span>
            </div>

            {visibleApps.length === 0 ? (
              <div className="p-5 rounded-2xl border border-dashed border-[#38352d] text-xs text-[#8a8579]">
                No app matched. Open the Composio dashboard to see every toolkit available to your project.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {visibleApps.map((toolkit) => {
                  const active = activeAccounts.some(
                    (account) =>
                      getAccountToolkit(account) === toolkit &&
                      String(account.status || '').toUpperCase() === 'ACTIVE'
                  );
                  return (
                    <div key={toolkit} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#1b1a17] border border-[#2d2b24]">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{APP_LABELS[toolkit] || toolkit}</div>
                        <div className="text-[10px] text-[#6d685e] font-mono truncate">{toolkit}</div>
                      </div>
                      {active ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[9px] font-mono px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                          <Check className="w-3 h-3" />
                          Connected
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={connecting === toolkit}
                          onClick={() => handleConnectApp(toolkit)}
                          className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#cc785c] hover:bg-[#db8a6e] text-black text-[10px] font-semibold disabled:opacity-50"
                        >
                          {connecting === toolkit ? 'Opening…' : 'Connect'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-[#151411] border border-[#2b2923]">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              <div className="text-[11px] leading-relaxed text-[#9c978b]">
                <div className="text-[#dcd8ce] font-semibold mb-1">How chat execution works</div>
                After you authorize an app, the server looks up ACTIVE Composio accounts for the same app user, searches the live tool catalog, executes the selected tool against the connected account, and feeds the real result back into the model. The green UI state is not treated as proof of authorization.
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-7 py-4 border-t border-[#24231e] flex items-center justify-between gap-3">
          <div className="text-[10px] text-[#6d685e]">
            {composioConnector.enabled ? 'Composio is enabled for this chat.' : 'Composio is disabled for this chat.'}
          </div>
          <div className="flex items-center gap-2">
            {onResetConnectors && (
              <button
                type="button"
                onClick={onResetConnectors}
                className="px-3 py-2 rounded-xl bg-[#292721] hover:bg-[#333129] border border-[#3d3b31] text-xs text-[#dcd8ce] inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#cc785c] hover:bg-[#db8a6e] text-black text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {isHubOpen && (
        <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[80vh] overflow-y-auto bg-[#1c1b18] border border-[#3a372e] rounded-2xl shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Composio app manager</h3>
                <p className="text-[11px] text-[#8a8579] mt-1">Authorize accounts without leaving this workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsHubOpen(false)}
                className="p-2 rounded-lg text-[#8a8579] hover:text-white hover:bg-[#282622]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search an app to connect"
                className="flex-1 px-3 py-2.5 rounded-xl bg-[#141310] border border-[#2d2b24] text-xs outline-none"
              />
              <button
                type="button"
                onClick={loadAccounts}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#292721] border border-[#3d3b31] text-[#dcd8ce]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {visibleApps.map((toolkit) => {
                const active = activeAccounts.some(
                  (account) =>
                    getAccountToolkit(account) === toolkit &&
                    String(account.status || '').toUpperCase() === 'ACTIVE'
                );

                return (
                  <div key={toolkit} className="p-3 rounded-xl bg-[#141310] border border-[#2b2923] flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold">{APP_LABELS[toolkit] || toolkit}</div>
                      <div className="text-[10px] text-[#6d685e] font-mono">{toolkit}</div>
                    </div>
                    <button
                      type="button"
                      disabled={active || connecting === toolkit}
                      onClick={() => handleConnectApp(toolkit)}
                      className={active
                        ? 'px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : 'px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[#cc785c] text-black disabled:opacity-50'}
                    >
                      {active ? 'Connected' : connecting === toolkit ? 'Opening…' : 'Connect'}
                    </button>
                  </div>
                );
              })}
            </div>

            {errorMessage && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
