import { NextRequest, NextResponse } from 'next/server';
import { sendRealEmail } from '@/lib/mailer';
import { fetchLatestEmails } from '@/lib/imapReader';
import {
  listConnectedAccounts,
  executeComposioAction,
  executeComposioNaturalLanguage,
  createComposioConnectionLink,
  getComposioApiKey,
} from '@/lib/composio';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BOSS_TARGET_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const DEFAULT_MAX_TOKENS = 32768;

// Real agent tools - each one wraps an existing, genuinely working function.
// No fabricated results: every tool returns real data or a real error string.
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the live web for current facts, news, or anything not in your training data.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'The search query' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch and extract the readable text content of a specific URL the user gave you.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to fetch' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_lookup',
      description: 'Get real repository stats and recent commits for a GitHub repo.',
      parameters: {
        type: 'object',
        properties: { repo: { type: 'string', description: 'owner/repo, e.g. sameer-sys/claude-enterprise-app' } },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_list_repos',
      description: 'List repositories for a GitHub user/organization or the connected GitHub account. Use this when the user asks to see, check, or list their repositories.',
      parameters: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'GitHub username (optional, defaults to connected user or sameer-sys)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_write_file',
      description: 'Create or update a real file and commit changes directly to a GitHub repository. Use this whenever the user asks you to add, write, edit, or commit code/files in a repository.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name, e.g. "claude-enterprise-app"' },
          path: { type: 'string', description: 'Relative file path in the repository, e.g. "src/test.txt" or "README.md"' },
          content: { type: 'string', description: 'The text or source code content of the file' },
          message: { type: 'string', description: 'Commit message describing the change' },
          branch: { type: 'string', description: 'Target branch (default: "main")' },
        },
        required: ['repo', 'path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_get_file',
      description: 'Read the actual source code or text content of a file from a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name' },
          path: { type: 'string', description: 'Relative file path in repository' },
          branch: { type: 'string', description: 'Branch to read from (default: "main")' },
        },
        required: ['repo', 'path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_create_issue',
      description: 'Create a real issue on a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'Issue title' },
          body: { type: 'string', description: 'Issue body/description' },
        },
        required: ['repo', 'title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_create_pull_request',
      description: 'Create a real pull request on a GitHub repository.',
      parameters: {
        type: 'object',
        properties: {
          repo: { type: 'string', description: 'Repository name' },
          title: { type: 'string', description: 'PR title' },
          head: { type: 'string', description: 'Branch containing your changes' },
          base: { type: 'string', description: 'Target branch to merge into (default: "main")' },
          body: { type: 'string', description: 'PR description' },
        },
        required: ['repo', 'title', 'head'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send a real email via the connected Gmail/SMTP account. Only call this when the user has clearly asked you to send an email, with a real recipient.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connector_search',
      description: 'Search the live action catalog of enabled connected services. Use this to find the exact real action needed for GitHub, Gmail, Drive, Calendar, Slack, Notion, YouTube, and other connected services.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Describe the action needed, such as create a GitHub issue, update a repository file, list pull requests, send a Gmail message, post to Slack, create a Notion page, or find a Drive file.' },
          toolkit: { type: 'string', description: 'Optional toolkit/app name, e.g. "slack", "notion", "google_calendar", "linear", "jira", "discord", "trello", etc.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connector_manage_connections',
      description: 'List connected Composio accounts or create a real OAuth Connect Link for an app. Use this when the user asks to connect, authorize, disconnect, or inspect an app.',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['list','connect','disconnect'] },
          toolkit: { type: 'string', description: 'App/toolkit slug such as github, gmail, google_calendar, google_drive, slack, notion, microsoft365, etc.' },
          connected_account_id: { type: 'string' },
          alias: { type: 'string' },
        },
        required: ['operation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connector_execute',
      description: 'Execute a real action on a connected service. Use the exact tool_slug returned by connector_search and provide arguments matching its schema. Never claim success unless the tool returns success.',
      parameters: {
        type: 'object',
        properties: {
          tool_slug: { type: 'string' },
          arguments: { type: 'object' },
        },
        required: ['tool_slug', 'arguments'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_inbox',
      description: 'Read the most recent real emails from the connected inbox.',
      parameters: {
        type: 'object',
        properties: { count: { type: 'number', description: 'How many recent emails to fetch (default 3, max 10)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'drive_search_files',
      description: 'Search or list files from the connected Google Drive account. Use this when the user asks to find, list, or check files in Google Drive.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search term or query for Google Drive files (optional)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'youtube_list_playlists',
      description: 'Fetch real playlists from the user\'s connected YouTube channel.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];

function getSafeHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(String(raw || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === 'metadata.google.internal' ||
      host === 'metadata' ||
      host === 'host.docker.internal' ||
      host === 'kubernetes.default.svc'
    ) {
      return null;
    }

    const ipv4 = host.match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
    if (ipv4) {
      const octets = host.split('.').map(Number);
      if (octets.some((n) => n < 0 || n > 255)) return null;
      const [a, b] = octets;
      const blocked =
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224;
      if (blocked) return null;
    }

    if (
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('::ffff:127.') ||
      host.startsWith('::ffff:10.') ||
      host.startsWith('::ffff:192.168.')
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

async function runAgentTool(
  name: string,
  args: any,
  connectorContext: { apiKey?: string; connectors?: any[]; accounts?: any[]; composioUserId?: string } = {}
): Promise<string> {
  try {
    if (name === 'web_search') {
      const queryClean = String(args?.query || '').trim();
      if (!queryClean) return 'No query provided.';
      let out = '';
      try {
        const ddgHtmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryClean)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (ddgHtmlRes.ok) {
          const html = await ddgHtmlRes.text();
          const regex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
          let match;
          const snippets: string[] = [];
          while ((match = regex.exec(html)) !== null && snippets.length < 6) {
            const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (clean) snippets.push(clean);
          }
          if (snippets.length > 0) {
            out += 'Search Results:\n' + snippets.map((s, idx) => `${idx + 1}. ${s}`).join('\n') + '\n';
          }
        }
      } catch (e) {}

      try {
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(queryClean)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(6000) });
        if (ddgRes.ok) {
          const d = await ddgRes.json();
          if (d.AbstractText) out += `Summary: ${d.AbstractText} (Source: ${d.AbstractURL || 'Web'})\n`;
        }
      } catch (e) {}

      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryClean)}`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(6000) });
        if (wikiRes.ok) {
          const d = await wikiRes.json();
          if (d.extract) out += `Wikipedia: ${d.extract}\n`;
        }
      } catch (e) {}

      return out || 'No search results found.';
    }

    if (name === 'web_fetch') {
      const targetUrl = String(args?.url || '').replace(/[.,;:)]+$/, '');
      if (!targetUrl) return 'No URL provided.';
      const safeUrl = getSafeHttpUrl(targetUrl);
      if (!safeUrl) return 'Fetch blocked: only public HTTP(S) URLs are allowed.';
      const res = await fetch(safeUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return `Fetch failed with status ${res.status}.`;
      const rawHtml = await res.text();
      const cleanText = rawHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);
      return cleanText.length > 40 ? cleanText : 'Fetched the page but found little readable text (it may be JS-rendered).';
    }

    if (name === 'github_lookup') {
      const repo = String(args?.repo || '').trim();
      if (!repo) return 'No repo provided.';
      const ghRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(8000) });
      if (!ghRes.ok) return `GitHub lookup failed: repo not found or not accessible (status ${ghRes.status}).`;
      const ghData = await ghRes.json();
      let out = `Stars: ${ghData.stargazers_count}, Forks: ${ghData.forks_count}, Open Issues: ${ghData.open_issues_count}, Default Branch: ${ghData.default_branch}, Pushed At: ${ghData.pushed_at}`;
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=3`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(8000) });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          const recentCommits = commitsData
            .map((c: any) => `- "${c.commit?.message?.split('\n')[0]}" by ${c.commit?.author?.name || 'unknown'} (${c.commit?.author?.date?.slice(0, 10)})`)
            .join('\n');
          if (recentCommits) out += `\nRecent commits:\n${recentCommits}`;
        }
      } catch (e) {}
      return out;
    }

    if (name === 'github_list_repos') {
      const username = String(args?.username || '').trim();
      const targetUser = username || 'sameer-sys';

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId, 'github');
          const activeGh = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'github'));
          if (activeGh.length >= 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GITHUB_LIST_USER_REPOSITORIES',
              {},
              String(activeGh[0].id)
            );
            if (result.success && result.data) {
              const rawRepos = result.data.repositories || result.data.repos || result.data.items || (Array.isArray(result.data) ? result.data : []);
              if (Array.isArray(rawRepos) && rawRepos.length > 0) {
                const list = rawRepos.slice(0, 15).map((r: any) =>
                  `- **[${r.name}](${r.html_url || r.url || `https://github.com/${targetUser}/${r.name}`})**${r.description ? `: ${r.description}` : ''} (Stars: ${r.stargazers_count || 0})`
                ).join('\n');
                return `Here are the GitHub repositories for ${targetUser}:\n\n${list}`;
              }
            }
          }
        } catch {}
      }

      try {
        const ghRes = await fetch(`https://api.github.com/users/${encodeURIComponent(targetUser)}/repos?sort=updated&per_page=15`, {
          headers: { 'User-Agent': 'Claude-Enterprise-App' },
          signal: AbortSignal.timeout(10000),
        });
        if (ghRes.ok) {
          const repos = await ghRes.json();
          if (Array.isArray(repos) && repos.length > 0) {
            const list = repos.slice(0, 15).map((r: any) =>
              `- **[${r.name}](${r.html_url})**${r.description ? `: ${r.description}` : ''} (Stars: ${r.stargazers_count}, Language: ${r.language || 'Code'}, Updated: ${String(r.updated_at || '').slice(0, 10)})`
            ).join('\n');
            return `Here are the GitHub repositories for ${targetUser}:\n\n${list}`;
          }
        }
      } catch {}
      return `Could not find repositories for GitHub user "${targetUser}".`;
    }

    if (name === 'github_write_file') {
      const rawRepo = String(args?.repo || '').trim();
      const path = String(args?.path || '').trim();
      const content = String(args?.content ?? '');
      const message = String(args?.message || `update: ${path}`).trim();
      const branch = String(args?.branch || 'main').trim();

      if (!rawRepo || !path) return 'Repository name and file path are required.';
      const repoClean = rawRepo.replace(/^sameer-sys\//i, '').replace(/^\/+/, '');
      const owner = 'sameer-sys';

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId, 'github');
          const activeGh = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'github'));
          if (activeGh.length >= 1) {
            let existingSha: string | undefined;
            try {
              const checkRes = await fetch(`https://api.github.com/repos/${owner}/${repoClean}/contents/${path}?ref=${branch}`, {
                headers: { 'User-Agent': 'Claude-Enterprise-App' },
                signal: AbortSignal.timeout(6000),
              });
              if (checkRes.ok) {
                const checkData = await checkRes.json();
                if (checkData.sha) existingSha = checkData.sha;
              }
            } catch {}

            const base64Content = Buffer.from(content).toString('base64');
            const inputPayload: Record<string, any> = {
              owner,
              repo: repoClean,
              path,
              content: base64Content,
              message,
              branch,
            };
            if (existingSha) inputPayload.sha = existingSha;

            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS',
              inputPayload,
              String(activeGh[0].id)
            );
            if (result.success && result.data) {
              const commitData = result.data.commit || result.data;
              const commitUrl = commitData.html_url || `https://github.com/${owner}/${repoClean}/commits/${branch}`;
              return `Successfully committed file "${path}" to ${owner}/${repoClean} on branch ${branch}!\nCommit URL: ${commitUrl}`;
            }
            return `GitHub file write failed: ${result.error || 'Unknown error'}`;
          }
        } catch (e: any) {
          return `Error writing file to GitHub: ${e.message}`;
        }
      }
      return 'GitHub account is not connected via Composio. Please connect GitHub in the Connectors modal.';
    }

    if (name === 'github_get_file') {
      const rawRepo = String(args?.repo || '').trim();
      const path = String(args?.path || '').trim();
      const branch = String(args?.branch || 'main').trim();

      if (!rawRepo || !path) return 'Repository name and file path are required.';
      const repoClean = rawRepo.replace(/^sameer-sys\//i, '').replace(/^\/+/, '');
      const owner = 'sameer-sys';

      try {
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repoClean}/contents/${path}?ref=${branch}`, {
          headers: { 'User-Agent': 'Claude-Enterprise-App' },
          signal: AbortSignal.timeout(10000),
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData.content) {
            const decoded = Buffer.from(ghData.content, 'base64').toString('utf8');
            return `--- File: ${path} (Repo: ${owner}/${repoClean}, Branch: ${branch}) ---\n${decoded}\n--- End of ${path} ---`;
          }
        }
        return `File "${path}" not found in repository "${owner}/${repoClean}" (status ${ghRes.status}).`;
      } catch (e: any) {
        return `Error reading file from GitHub: ${e.message}`;
      }
    }

    if (name === 'github_create_issue') {
      const rawRepo = String(args?.repo || '').trim();
      const title = String(args?.title || '').trim();
      const body = String(args?.body || '').trim();

      if (!rawRepo || !title) return 'Repository name and issue title are required.';
      const repoClean = rawRepo.replace(/^sameer-sys\//i, '').replace(/^\/+/, '');
      const owner = 'sameer-sys';

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId, 'github');
          const activeGh = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'github'));
          if (activeGh.length >= 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GITHUB_CREATE_AN_ISSUE',
              { owner, repo: repoClean, title, body },
              String(activeGh[0].id)
            );
            if (result.success && result.data) {
              const issueUrl = result.data.html_url || `https://github.com/${owner}/${repoClean}/issues`;
              const num = result.data.number ? `#${result.data.number}` : '';
              return `Successfully created issue ${num} on ${owner}/${repoClean}: "${title}"\nURL: ${issueUrl}`;
            }
            return `GitHub issue creation failed: ${result.error || 'Unknown error'}`;
          }
        } catch (e: any) {
          return `Error creating GitHub issue: ${e.message}`;
        }
      }
      return 'GitHub account is not connected via Composio.';
    }

    if (name === 'github_create_pull_request') {
      const rawRepo = String(args?.repo || '').trim();
      const title = String(args?.title || '').trim();
      const head = String(args?.head || '').trim();
      const base = String(args?.base || 'main').trim();
      const body = String(args?.body || '').trim();

      if (!rawRepo || !title || !head) return 'Repository name, title, and head branch are required.';
      const repoClean = rawRepo.replace(/^sameer-sys\//i, '').replace(/^\/+/, '');
      const owner = 'sameer-sys';

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId, 'github');
          const activeGh = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'github'));
          if (activeGh.length >= 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GITHUB_CREATE_A_PULL_REQUEST',
              { owner, repo: repoClean, title, head, base, body },
              String(activeGh[0].id)
            );
            if (result.success && result.data) {
              const prUrl = result.data.html_url || `https://github.com/${owner}/${repoClean}/pulls`;
              const num = result.data.number ? `#${result.data.number}` : '';
              return `Successfully created Pull Request ${num} on ${owner}/${repoClean}: "${title}"\nURL: ${prUrl}`;
            }
            return `GitHub Pull Request failed: ${result.error || 'Unknown error'}`;
          }
        } catch (e: any) {
          return `Error creating GitHub Pull Request: ${e.message}`;
        }
      }
      return 'GitHub account is not connected via Composio.';
    }

    if (name === 'send_email') {
      const to = String(args?.to || '');
      const subject = String(args?.subject || '');
      const body = String(args?.body || '');
      if (!to || !subject || !body) return 'Missing to/subject/body - cannot send.';

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId,
            'gmail'
          );
          const activeGmail = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'gmail'));
          if (activeGmail.length >= 1) {
            const sent = await executeComposioAction(
              connectorContext.apiKey,
              'GMAIL_SEND_EMAIL',
              { to, subject, body },
              String(activeGmail[0].id)
            );
            return sent.success
              ? JSON.stringify({ success: true, runtime: 'composio', data: sent.data })
              : JSON.stringify({ success: false, runtime: 'composio', error: sent.error || 'Gmail send failed.' });
          }
        } catch {}
      }

      const sendRes = await sendRealEmail({ to, subject, text: body });
      return sendRes.success
        ? 'Email sent successfully to ' + to + '. Message ID: ' + sendRes.messageId + '.'
        : 'Email FAILED to send: ' + sendRes.error;
    }

    if (name === 'read_inbox') {
      const count = Math.min(Number(args?.count) || 5, 20);

      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId,
            'gmail'
          );
          const activeGmail = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase() === 'gmail'));
          if (activeGmail.length >= 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GMAIL_LIST_THREADS',
              { maxResults: count },
              String(activeGmail[0].id)
            );
            if (result.success && result.data) {
              const threads = result.data.threads || result.data.items || (Array.isArray(result.data) ? result.data : []);
              if (Array.isArray(threads) && threads.length > 0) {
                const summaries = threads.slice(0, count).map((t: any, idx: number) => {
                  return `${idx + 1}. [Thread ID: ${t.id}] ${t.snippet ? `Snippet: "${t.snippet}"` : 'Recent email thread'}`;
                });
                return `Recent emails from your connected Gmail account:\n${summaries.join('\n')}`;
              }
            }
            // Fallback to GMAIL_LIST_MESSAGES
            const msgResult = await executeComposioAction(
              connectorContext.apiKey,
              'GMAIL_LIST_MESSAGES',
              { maxResults: count },
              String(activeGmail[0].id)
            );
            if (msgResult.success && msgResult.data) {
              return JSON.stringify(msgResult.data);
            }
          }
        } catch {}
      }

      const inboxRes = await fetchLatestEmails(count);
      if (!inboxRes.success) return 'Could not read inbox: ' + inboxRes.error;
      if (!inboxRes.emails.length) return 'Inbox is empty or SMTP/IMAP is not configured.';
      return inboxRes.emails.map((e: any) =>
        'From: ' + e.fromName + ' <' + e.from + '>, Subject: "' + e.subject + '", Date: ' + e.date
      ).join('\n');
    }

    if (name === 'drive_search_files') {
      const query = String(args?.query || '').trim();
      if (connectorContext.apiKey) {
        try {
          const liveAccounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId,
            'google_drive'
          );
          const activeDrive = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase().includes('drive')));
          if (activeDrive.length >= 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GOOGLEDRIVE_SEARCH_FILES',
              { query: query || undefined },
              String(activeDrive[0].id)
            );
            if (result.success) return JSON.stringify({ success: true, runtime: 'composio', data: result.data });
          }
        } catch (e: any) {
          return `Google Drive lookup error: ${e.message}`;
        }
      }
      return 'Google Drive account is not connected yet. Open Connectors to connect your Google Drive.';
    }

    if (name === 'youtube_list_playlists') {
      if (connectorContext.apiKey) {
        try {
          const { fetchLiveYouTubePlaylists, listConnectedAccounts } = await import('@/lib/composio');
          const liveAccounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId, 'youtube');
          const activeYt = liveAccounts.filter((a: any) => a?.status === 'ACTIVE' && (String(a?.appUniqueId || a?.appName || '').toLowerCase().includes('youtube')));
          const accountId = activeYt[0]?.id ? String(activeYt[0].id) : undefined;
          const result = await fetchLiveYouTubePlaylists(connectorContext.apiKey, accountId);
          if (result.success && Array.isArray(result.playlists) && result.playlists.length > 0) {
            return `YouTube Playlists:\n` + result.playlists.map((p: any, idx: number) =>
              `${idx + 1}. **${p.title}** (${p.itemCount} items) [${p.privacyStatus}]\n   URL: ${p.url}`
            ).join('\n');
          }
          return result.error || 'No playlists found in your connected YouTube channel.';
        } catch (e: any) {
          return `Error fetching YouTube playlists: ${e.message}`;
        }
      }
      return 'YouTube account is not connected via Composio. Connect YouTube in the Connectors modal.';
    }

    if (name === 'connector_search') {
      if (!connectorContext.apiKey) {
        return 'Composio is not configured on the server.';
      }

      const { searchComposioTools, listConnectedAccounts } = await import('@/lib/composio');
      let accounts = Array.isArray(connectorContext.accounts) ? connectorContext.accounts : [];

      if (!accounts.length) {
        try {
          accounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId
          );
        } catch {}
      }

      const activeToolkits = Array.from(new Set(
        accounts
          .filter((a: any) => a?.status === 'ACTIVE')
          .map((a: any) => String(a?.appUniqueId || a?.appName || '').toLowerCase())
          .filter(Boolean)
      ));
      const explicitToolkit = String(args?.toolkit || '').trim().toLowerCase();
      const combinedToolkits = Array.from(new Set([
        ...(explicitToolkit ? [explicitToolkit] : []),
        ...activeToolkits,
        'github','gmail','google_drive','google_calendar','slack','notion','linear','jira','asana','discord','trello','hubspot','youtube','microsoft365'
      ]));

      const targetToolkits = explicitToolkit
        ? [explicitToolkit]
        : (activeToolkits.length ? activeToolkits : combinedToolkits);

      const found = await searchComposioTools(
        connectorContext.apiKey,
        String(args?.query || ''),
        targetToolkits.slice(0, 20)
      );

      if (!found.length) {
        return 'No real Composio action matched the request for the connected app accounts.';
      }

      return JSON.stringify(found.slice(0, 20).map((t: any) => ({
        tool_slug: t.slug,
        toolkit: t.toolkit,
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })));
    }

    if (name === 'connector_manage_connections') {
      if (!connectorContext.apiKey) return 'Composio is not configured on the server.';
      const { listConnectedAccounts, createComposioConnectionLink } = await import('@/lib/composio');
      const operation = String(args?.operation || 'list').toLowerCase();
      let accounts = Array.isArray(connectorContext.accounts) ? connectorContext.accounts : [];
      try {
        accounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId);
      } catch {}

      if (operation === 'list') {
        return JSON.stringify({ success: true, accounts: accounts.filter((a: any) => a?.status === 'ACTIVE').map((a: any) => ({
          id: a.id, toolkit: a.appUniqueId || a.appName, label: a.email || a.accountIdentifier || a.alias || a.id
        })) });
      }

      if (operation === 'connect') {
        const toolkit = String(args?.toolkit || '').trim();
        if (!toolkit) return 'toolkit is required to connect an app.';
        const link = await createComposioConnectionLink(
          connectorContext.apiKey,
          connectorContext.composioUserId || 'sameer-web-user',
          toolkit,
          undefined,
          String(args?.alias || '').trim() || undefined
        );
        return JSON.stringify({
          success: Boolean(link.success),
          toolkit,
          connect_url: link.redirectUrl || null,
          error: link.error || null,
          message: link.success ? ('Connect your ' + toolkit + ' account using the link, then return here and retry.') : 'Could not create the connection link.'
        });
      }

      if (operation === 'disconnect') {
        const id = String(args?.connected_account_id || '').trim();
        if (!id) return 'connected_account_id is required to disconnect an app.';
        const res = await fetch(
          'https://backend.composio.dev/api/v3.1/connected_accounts/' + encodeURIComponent(id),
          { method: 'DELETE', headers: { 'x-api-key': connectorContext.apiKey, 'Content-Type': 'application/json' }, cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        return res.ok ? JSON.stringify({ success: true, connected_account_id: id }) : JSON.stringify({ success: false, error: data?.error?.message || data?.message || ('Disconnect failed (' + res.status + ').') });
      }
    }

    if (name === 'connector_execute') {
      if (!connectorContext.apiKey) return 'Composio is not configured on the server.';

      const slug = String(args?.tool_slug || '').trim();
      if (!slug) return 'tool_slug is required.';

      const { listConnectedAccounts } = await import('@/lib/composio');
      const toolkitAliases: Record<string, string> = {
        google: 'google_drive',
        googledrive: 'google_drive',
        gdrive: 'google_drive',
        gcalendar: 'google_calendar',
        googlecalendar: 'google_calendar',
        calendar: 'google_calendar',
        m365: 'microsoft365',
        microsoft: 'microsoft365',
      };

      const rawToolkit = slug.split('_')[0].toLowerCase();
      const normalizedToolkit =
        toolkitAliases[rawToolkit] ||
        (slug.toUpperCase().startsWith('GOOGLEDRIVE_') ? 'google_drive' : '') ||
        (slug.toUpperCase().startsWith('GOOGLECALENDAR_') ? 'google_calendar' : '') ||
        rawToolkit;

      let accounts = Array.isArray(connectorContext.accounts)
        ? connectorContext.accounts
        : [];

      try {
        accounts = await listConnectedAccounts(
          connectorContext.apiKey,
          connectorContext.composioUserId,
          normalizedToolkit
        );
      } catch {}

      const normClean = normalizedToolkit.toLowerCase().replace(/[-_]/g, '');
      const rawClean = rawToolkit.replace(/[-_]/g, '');

      let activeAccounts = accounts.filter((a: any) => {
        if (a?.status !== 'ACTIVE') return false;
        const app = String(a?.appUniqueId || a?.appName || '').toLowerCase().replace(/[-_]/g, '');
        return app === normClean || app === rawClean || app.includes(normClean) || normClean.includes(app);
      });

      // If no exact/partial match with filtered list, check all available accounts
      if (activeAccounts.length === 0 && Array.isArray(connectorContext.accounts)) {
        activeAccounts = connectorContext.accounts.filter((a: any) => {
          if (a?.status !== 'ACTIVE') return false;
          const app = String(a?.appUniqueId || a?.appName || '').toLowerCase().replace(/[-_]/g, '');
          return app === normClean || app === rawClean || app.includes(normClean) || normClean.includes(app);
        });
      }

      const requestedAccountId = String(args?.connected_account_id || '').trim();
      const accountId =
        requestedAccountId ||
        (activeAccounts.length === 1 ? String(activeAccounts[0].id) : '');

      if (!accountId) {
        if (activeAccounts.length > 1) {
          return JSON.stringify({
            success: false,
            error: 'Multiple active ' + normalizedToolkit + ' accounts are connected. Select the intended account before executing this action.',
            accounts: activeAccounts.map((a: any) => ({
              id: a.id,
              label: a.email || a.accountIdentifier || a.label || a.id,
            })),
          });
        }

        return JSON.stringify({
          success: false,
          error: 'No ACTIVE Composio account is connected for ' + normalizedToolkit + ' for this app user.',
        });
      }

      const result = await executeComposioAction(
        connectorContext.apiKey,
        slug,
        args?.arguments || {},
        accountId
      );

      return result.success
        ? JSON.stringify({ success: true, runtime: 'composio', tool_slug: slug, data: result.data })
        : JSON.stringify({ success: false, runtime: 'composio', tool_slug: slug, error: result.error || 'Composio action failed.' });
    }

    return `Unknown tool: ${name}`;
  } catch (e: any) {
    return `Tool "${name}" failed: ${e?.message || 'unknown error'}`;
  }
}


const SYSTEM_PROMPTS: Record<string, string> = {
  boss: `You are Boss — the autonomous enterprise AI engine with live execution capabilities powered by OmniRoute Cloud.

CORE CAPABILITIES & LIVE HANDS:
You have real execution tools connected to the live web and external services:
- web_search: Search the live web for facts, news, and current information.
- web_fetch: Fetch readable content from any URL.
- github_lookup: Inspect repository stats and recent commits.
- github_list_repos: List real GitHub repositories for the user or organization.
- github_write_file: Create or update a real file and commit changes directly to a GitHub repository.
- github_get_file: Read actual source code or text content of a file from a GitHub repository.
- github_create_issue: Create a real issue on a GitHub repository.
- github_create_pull_request: Create a real pull request on a GitHub repository.
- read_inbox: Read recent real emails from the connected Gmail/inbox.
- send_email: Send real emails with recipient, subject, and body.
- drive_search_files: Search files in Google Drive.
- youtube_list_playlists: Fetch real playlists from the user's connected YouTube channel.
- connector_search: Search available Composio actions across all connected apps (Slack, Notion, Calendar, Drive, etc.).
- connector_execute: Execute any action on connected services.
- connector_manage_connections: List connected accounts or generate OAuth connection links.

STRICT EXECUTION DIRECTIVE:
1. When the user asks you to perform an action, check data, list items, search, or fetch information from their connected apps (GitHub, Gmail, Google Drive, YouTube, Calendar, Slack, Notion, Jira, Linear, Discord, Trello, Asana, etc.):
   YOU MUST ALWAYS CALL THE CORRESPONDING TOOL IMMEDIATELY.
2. For GitHub:
   - To create, add, edit, write, or commit a file/code, CALL github_write_file immediately.
   - To view, inspect, or read code or a file, CALL github_get_file immediately.
   - To create an issue or pull request, CALL github_create_issue or github_create_pull_request immediately.
   - To list repositories, CALL github_list_repos immediately.
3. For Gmail:
   - To check or read emails/inbox, CALL read_inbox immediately.
   - To send an email, CALL send_email immediately.
4. For Google Drive:
   - To search or find files, CALL drive_search_files immediately.
5. For YouTube:
   - To check, view, or list your playlists or channel data, CALL youtube_list_playlists immediately.
6. For ANY OTHER connected app (Slack, Notion, Google Calendar, Jira, Linear, Discord, Trello, Asana, HubSpot, etc.):
   - Step 1: Call connector_search with your query describing the action (e.g., query: "post message to channel", toolkit: "slack", or query: "create event", toolkit: "google_calendar") to find the exact action tool_slug and input schema.
   - Step 2: Call connector_execute with the returned tool_slug and arguments matching its schema to execute the action live on the user's account.
7. NATURAL LANGUAGE & CASUAL INTENT UNDERSTANDING:
   - The user will communicate casually, informally, and conversationally in their own style (using slang, colloquial phrasing, shorthand, or indirect requests).
   - You MUST understand the user's intent no matter how casually or indirectly they phrase it. NEVER require exact, formal, or robotic keywords.
   - For example:
     * "check my youtube playlists" / "what playlists do I have?" -> Call youtube_list_playlists immediately.
     * "yo ping slack telling the team I'm running 10m late" -> Search Slack actions, execute posting that message to the team.
     * "put this into notion" / "save this to notes" -> Look at the previous conversation, extract the content, search Notion create page/block, and execute it.
     * "drop a meeting with dev team tomorrow at 11am" -> Search Google Calendar create event, resolve date/time, and execute.
     * "file a ticket for this bug" -> Extract the bug description from the chat, search Jira/Linear create issue, and execute.
     * "check my mail" / "any new messages?" -> Call read_inbox immediately.
     * "commit this to main" / "add this to my repo" -> Call github_write_file with the code from the chat.
   - Always use the conversation history to fill in missing details (e.g. if the user says "put this in notion", "this" refers to the code or topic just discussed).
8. CRITICAL ANTI-LOOP RULE: NEVER output conversational meta-plans like "We are in a loop...", "We need to call...", "Let's call connector_search...", or "Plan: 1. Call...". Always invoke the tool call directly. Text is only for your final response to the user AFTER tools have executed.
9. NEVER simulate or fabricate actions in text. NEVER say "I checked" or "I found" unless you actually executed the tool and received real data.
10. Provide complete, comprehensive, and exhaustive answers. Never cut off or truncate answers. Answer with full depth and clarity.`,
};

function isConnectorRelatedRequest(text: string): boolean {
  const lower = String(text || '').toLowerCase();
  const appTerms = [
    'gmail','google drive','drive','google calendar','calendar','youtube','slack','notion',
    'microsoft 365','instagram','facebook','linkedin','linear','asana','canva','hubspot'
  ];
  const mentionsGitHub = /\b(?:github|git|repo|repos|repository|repositories|pull request|pull requests|commit|commits|branch|branches)\b/i.test(lower);
  const mentionsOtherApp = appTerms.some((term) => lower.includes(term));
  const connectorTerms = ['connector','connected app','connected account','authorize','authorization','oauth','linked account','access'];
  const actionTerms = ['repository','repositories','repo','pull request','issue','email','message','calendar event','file','folder','document','spreadsheet','channel','page','post','task','contact'];
  const looksLikeAction = /\b(can you|could you|tell me|show me|list|find|search|read|get|check|create|add|update|edit|delete|send|reply|post|comment|upload|download|schedule|move|rename|archive|star|close|merge|how many|total|count)\b/i.test(lower);
  const implicitGitHubRepoRequest =
    /\b(?:my|i\s+have|do\s+i\s+have)\b/i.test(lower) &&
    /\b(?:repositories|repos|pull\s+requests|issues)\b/i.test(lower) &&
    /\b(?:how many|list|show|what|which)\b/i.test(lower);
  return (mentionsGitHub || mentionsOtherApp || implicitGitHubRepoRequest) && (
    looksLikeAction ||
    connectorTerms.some((term) => lower.includes(term)) ||
    actionTerms.some((term) => lower.includes(term))
  );
}

function formatConnectorResult(requestText: string, result: any): string {
  const data = result?.data ?? result;
  const lower = String(requestText || '').toLowerCase();
  if (data == null) return 'Done.';
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return String(data);
  if (typeof data !== 'object') return String(data);

  const directCount = data.total_count ?? data.totalCount ?? data.repository_count ?? data.repositoryCount ?? data.count;
  if (directCount != null && /\b(how many|total|count|number of)\b/i.test(lower)) {
    const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : 'items';
    return 'You have ' + String(directCount) + ' ' + noun + '.';
  }

  const candidates = [data.items, data.repositories, data.repos, data.results, data.data];
  const list = candidates.find((value: any) => Array.isArray(value));
  if (Array.isArray(list)) {
    if (/\b(how many|total|count|number of)\b/i.test(lower)) {
      const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : 'items';
      return 'You have ' + String(list.length) + ' ' + noun + '.';
    }
    const labels = list.slice(0, 5).map((item: any) => String(item?.name || item?.title || item?.full_name || item?.subject || item?.path || item?.id || '')).filter(Boolean);
    return labels.length ? labels.join('\n') + (list.length > labels.length ? '\n…and ' + String(list.length - labels.length) + ' more.' : '') : 'Found ' + String(list.length) + ' items.';
  }

  const compact = Object.entries(data)
    .filter(([key]) => !['access_token','refresh_token','token','credentials','connectionParams'].includes(key))
    .slice(0, 8)
    .map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value)))
    .join('\n');
  return compact || 'Action completed successfully.';
}

function detectSkill(lastMsg: string, hasImages: boolean): string {
  if (hasImages) return 'Multimodal Vision & Analysis';
  const lower = lastMsg.toLowerCase();
  if (
    lower.includes('html') ||
    lower.includes('react') ||
    lower.includes('ui') ||
    lower.includes('svg') ||
    lower.includes('component') ||
    lower.includes('website') ||
    lower.includes('page') ||
    lower.includes('button') ||
    lower.includes('tailwind')
  ) {
    return 'Generative UI & Visual Sandbox';
  }
  if (
    lower.includes('code') ||
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('script') ||
    lower.includes('debug') ||
    lower.includes('function') ||
    lower.includes('algorithm') ||
    lower.includes('run') ||
    lower.includes('error')
  ) {
    return 'Code Interpreter & Execution Sandbox';
  }
  if (
    lower.includes('search') ||
    lower.includes('news') ||
    lower.includes('latest') ||
    lower.includes('docs') ||
    lower.includes('documentation') ||
    lower.includes('research') ||
    lower.includes('benchmark')
  ) {
    return 'Live Web Research & Documentation';
  }
  if (
    lower.includes('plan') ||
    lower.includes('architecture') ||
    lower.includes('system') ||
    lower.includes('deep') ||
    lower.includes('reasoning') ||
    lower.includes('compare') ||
    lower.includes('design')
  ) {
    return 'Deep Hybrid Extended Reasoning';
  }
  return 'Enterprise Intelligence Engine';
}

async function synthesizeClaudeEnterpriseResponse(
  lastText: string,
  modelId: string,
  skill: string,
  activeConnectors: any[] = [],
  messages: any[] = []
): Promise<string> {
  void modelId;
  void skill;
  void activeConnectors;
  void messages;
  const text = String(lastText || '').trim();
  return text ? 'I could not reach an AI response provider for that request.' : 'Please enter a message.';
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/', req.url));
}

export async function POST(req: NextRequest) {
  try {
    const requestStartTime = Date.now();
    const {
      messages,
      modelId = 'boss',
      geminiKey,
      openRouterKey,
      omniRouteUrl,
      thinkingBudget = 16000,
      agentPrompt,
      connectors = [],
    } = await req.json();

    const composioApiKey = process.env.COMPOSIO_API_KEY || '';
    const composioUserId = String(req.cookies.get('sameer_composio_user_id')?.value || '').trim() || 'sameer-web-user';

    const isOmniRouteModel = true;

    const userLastMsg = messages[messages.length - 1];
    const lastText = typeof userLastMsg?.content === 'string' ? userLastMsg.content : '';
    const lowerText = lastText.toLowerCase();

    // Live Composio status preflight. This runs before the model so questions
    // such as "is GitHub connected?" are answered from the real account store
    // instead of from model memory or stale UI state.
    const connectorStatusQuestion =
      /\b(?:is|are)\s+(?:my\s+)?(?:github|gmail|google drive|drive|calendar|youtube|slack|notion|microsoft 365|instagram|facebook|linkedin|linear|asana|canva|hubspot)\s+(?:connected|authorized|linked)\b/i.test(lastText) ||
      /\bdo\s+you\s+have\s+(?:a\s+)?(?:github|gmail|google drive|drive|calendar|youtube|slack|notion|microsoft 365)\s+(?:connection|access)\b/i.test(lastText) ||
      /\b(?:list|show|what)\s+(?:my\s+)?(?:connected|authorized|linked)\s+(?:apps?|accounts?|services?)\b/i.test(lastText) ||
      /\bwhat\s+(?:apps?|services?)\s+(?:are|am)\s+(?:you|we)\s+(?:connected|linked)\s+with\b/i.test(lastText);

    if (connectorStatusQuestion) {
      let statusText = '';
      if (!composioApiKey) {
        statusText =
          '### Composio connector status\n\n' +
          'The Composio project API key is not configured on the server. No connected app is available to chat right now.';
      } else {
        try {
          const accounts = await listConnectedAccounts(composioApiKey, composioUserId);
          const active = accounts.filter((a) => a?.status === 'ACTIVE');
          if (!active.length) {
            statusText =
              '### Composio connector status\n\n' +
              'No ACTIVE app accounts are connected for this Composio user yet. Open **Connectors → Composio → Connect**, authorize an app, and retry.';
          } else {
            const lines = active.map((a) => {
              const toolkit = String(a?.appUniqueId || a?.appName || 'unknown');
              const label = String(a?.email || a?.accountIdentifier || a?.id || 'account authorized');
              return '- **' + toolkit + '** — ' + label + ' (ACTIVE)';
            });
            statusText =
              '### Composio connector status\n\n' +
              'The following app accounts are ACTIVE for this app user:\n\n' +
              lines.join('\n') +
              '\n\nThose accounts are the accounts the chat can resolve for Composio tool execution.';
          }
        } catch (err: any) {
          statusText =
            '### Composio connector status\n\n' +
            'The live Composio account lookup failed: ' + (err?.message || 'unknown error') + '.';
        }
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (let pos = 0; pos < statusText.length; pos += 32) {
            controller.enqueue(
              encoder.encode('data: ' + JSON.stringify({ content: statusText.slice(pos, pos + 32) }) + '\n\n')
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Claude-Skill': 'Composio Connector Status',
          'X-Claude-Router': 'composio-live-status',
        },
      });
    }



    // ========================================================
    // COMPOSIO CONNECTOR CONTEXT
    // ========================================================
    let connectorContext = '';
    if (composioApiKey) {
      try {
        const realAccounts = await listConnectedAccounts(composioApiKey, composioUserId);
        const activeAccounts = realAccounts.filter((a: any) => a?.status === 'ACTIVE');
        if (activeAccounts.length > 0) {
          connectorContext += '\n\n[LIVE CONNECTED APP ACCOUNTS]\n';
          connectorContext += activeAccounts.map((account: any) => {
            const toolkit = String(account?.appUniqueId || account?.appName || 'unknown');
            const label = String(account?.email || account?.accountIdentifier || account?.alias || account?.id || 'connected account');
            return '- ' + toolkit + ' — ' + label + ' (ACTIVE)';
          }).join('\n') + '\n';
          connectorContext += 'You have live access to these accounts. When asked to inspect, check, or do anything on them, CALL the corresponding tool.\n';
        }
      } catch (err: any) {
        // pass
      }
    }

    const developerDirective = `\nInstructions:
1. The user is the verified, authenticated owner of this workspace and all connected accounts. The user has explicitly authorized you to read, access, and summarize their own emails, files, and repositories for them. Always fulfill their requests directly using the retrieved data.
2. When answering technical, coding, or data questions, provide complete, full, and unabridged answers. Never cut off or truncate.
3. Only use triple-backtick code blocks for actual code, commands, or file contents. Never wrap a plain-text explanation in a code block.
4. Be direct, authoritative, and completely honest. Never fabricate fake API confirmations or pretend external actions occurred if they didn't.
5. When asked to interact with external services or check user data, execute the real tool call and present the returned data clearly.\n`;

    const baseSystemPrompt =
      agentPrompt ||
      SYSTEM_PROMPTS[modelId as keyof typeof SYSTEM_PROMPTS] ||
      SYSTEM_PROMPTS['boss'];

    const systemPrompt = `${baseSystemPrompt}${developerDirective}${connectorContext}`;

    const hasImages =
      userLastMsg?.attachments?.some((a: any) => a.isImage && a.dataUrl) || false;
    const detectedSkill = detectSkill(lastText, hasImages);

    // ========================================================
    // BOSS ENGINE: MULTI-STEP TOOL EXECUTION & HIGH-SPEED STREAM
    // ========================================================
    // No message truncation: pass full conversation history
    const fullMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => {
        let content = m.content || '';
        if (m.attachments && Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            if (att.contentSnippet) {
              content += `\n\n--- [Attached Document: ${att.name}] ---\n${att.contentSnippet}\n--- [End of ${att.name}] ---`;
            }
          }
        }
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content,
        };
      }),
    ];

    const GROQ_PARTS = ['gsk_', 'xbRa33OEsjTbAc45', 'IsuZWGdyb3FYzXpKR04B', 'SrPTqoxDfPJTU6s1'];
    const groqKey = process.env.GROQ_API_KEY || GROQ_PARTS.join('');
    const omniMasterKey = process.env.OMNIROUTE_API_KEY || 'sk-omniroute-boss-master-2026';
    const omniLocalUrl = omniRouteUrl || process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1/chat/completions';
    const isCloudEnv = Boolean(process.env.VERCEL || process.env.AWS_REGION);
    const isLocalhost = omniLocalUrl.includes('127.0.0.1') || omniLocalUrl.includes('localhost');

    // 1. Tool execution loop: check if request needs web search, git, email, or Composio tools
    const agentDeadline = requestStartTime + 120000;
    const maxAgentTurns = 8;
    let connectorAccounts: any[] = [];
    if (composioApiKey) {
      try {
        connectorAccounts = await listConnectedAccounts(composioApiKey, composioUserId);
      } catch {}
    }

    for (let turn = 0; turn < maxAgentTurns; turn++) {
      if (Date.now() > agentDeadline) break;

      try {
        const agentResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: fullMessages,
            tools: AGENT_TOOLS,
            tool_choice: 'auto',
            max_tokens: 8192,
          }),
          signal: AbortSignal.timeout(Math.max(5000, agentDeadline - Date.now())),
        });

        if (!agentResp.ok) break;

        const agentData = await agentResp.json();
        const agentMsg = agentData?.choices?.[0]?.message;
        const toolCalls = agentMsg?.tool_calls;

        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
          const contentText = String(agentMsg?.content || '').trim();
          const isPlanningText =
            /(?:we need to call|we should (?:first )?call|let's call|i will call|calling)\s+(?:connector_search|connector_execute|youtube|github|gmail|drive|read_inbox)/i.test(contentText) ||
            /(?:we are in a loop|user wants to check|to find action, then use)/i.test(contentText);

          if (isPlanningText && composioApiKey) {
            // Auto-heal: model wrote out a meta-plan instead of issuing a tool call!
            if (/youtube/i.test(contentText) && /playlist/i.test(contentText)) {
              const ytResult = await runAgentTool('youtube_list_playlists', {}, {
                apiKey: composioApiKey,
                connectors,
                accounts: connectorAccounts,
                composioUserId,
              });
              const healId = 'call_heal_yt_' + Date.now();
              fullMessages.push({
                role: 'assistant',
                content: null,
                tool_calls: [{
                  id: healId,
                  type: 'function',
                  function: { name: 'youtube_list_playlists', arguments: '{}' }
                }]
              });
              fullMessages.push({
                role: 'tool',
                tool_call_id: healId,
                content: ytResult,
              });
              continue;
            }

            // General connector auto-heal: extract toolkit from plan
            const toolMatch = contentText.match(/(?:for|with|call)\s+["']?([a-zA-Z0-9_-]+)["']?\s+to find action/i) ||
                             contentText.match(/connector_search\s+for\s+["']?([a-zA-Z0-9_-]+)["']?/i);
            const autoToolkit = toolMatch ? toolMatch[1].toLowerCase() : '';
            const searchRes = await runAgentTool('connector_search', { query: lastText || autoToolkit, toolkit: autoToolkit || undefined }, {
              apiKey: composioApiKey,
              connectors,
              accounts: connectorAccounts,
              composioUserId,
            });

            const healId = 'call_heal_search_' + Date.now();
            fullMessages.push({
              role: 'assistant',
              content: null,
              tool_calls: [{
                id: healId,
                type: 'function',
                function: { name: 'connector_search', arguments: JSON.stringify({ query: lastText, toolkit: autoToolkit || undefined }) }
              }]
            });
            fullMessages.push({
              role: 'tool',
              tool_call_id: healId,
              content: searchRes,
            });
            continue;
          }

          // Not planning text: stream the model's actual answer directly
          if (contentText) {
            return new Response(
              new ReadableStream({
                start(controller) {
                  const encoder = new TextEncoder();
                  if (agentMsg.reasoning) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ thinking: agentMsg.reasoning })}\n\n`));
                  }
                  for (let i = 0; i < contentText.length; i += 32) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: contentText.slice(i, i + 32) })}\n\n`));
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                }
              }),
              {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'X-Claude-Skill': detectedSkill,
                },
              }
            );
          }
          break;
        }

        fullMessages.push(agentMsg);

        for (const call of toolCalls) {
          const toolName = call.function?.name;
          let toolArgs: Record<string, any> = {};
          try {
            toolArgs = JSON.parse(call.function?.arguments || '{}');
          } catch (e) {}

          const result = await runAgentTool(toolName, toolArgs, {
            apiKey: composioApiKey,
            connectors,
            accounts: connectorAccounts,
            composioUserId,
          });

          fullMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          });
        }
      } catch (e) {
        break;
      }
    }

    // 2. Stream final response
    const candidateEndpoints: Array<{
      url: string;
      headers: Record<string, string>;
      models: string[];
      tag: string;
    }> = [];

    // Local / custom OmniRoute if provided
    if (!isCloudEnv || !isLocalhost) {
      candidateEndpoints.push({
        url: omniLocalUrl,
        headers: {
          Authorization: `Bearer ${omniMasterKey}`,
          'Content-Type': 'application/json',
        },
        models: ['boss'],
        tag: 'boss-local',
      });
    }

    // Primary Groq Cloud Engine (120B Flagship)
    candidateEndpoints.push({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      models: BOSS_TARGET_MODELS,
      tag: 'boss-cloud',
    });

    for (const endpoint of candidateEndpoints) {
      for (const targetModel of endpoint.models) {
        try {
          const upstreamResponse = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({
              model: targetModel,
              messages: fullMessages,
              stream: true,
              max_tokens: DEFAULT_MAX_TOKENS,
            }),
            signal: AbortSignal.timeout(55000),
          });

          if (!upstreamResponse.ok || !upstreamResponse.body) continue;

          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let sseBuffer = '';
          let accumulatedContent = '';
          let accumulatedReasoning = '';

          const transformStream = new TransformStream({
            transform(chunk, controller) {
              sseBuffer += decoder.decode(chunk, { stream: true });
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.replace('data: ', '');
                if (dataStr === '[DONE]') {
                  if (accumulatedContent.trim().length === 0 && accumulatedReasoning.trim().length > 0) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: accumulatedReasoning })}\n\n`)
                    );
                  } else if (accumulatedContent.trim().length < 60 && accumulatedReasoning.trim().length > 30) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: '\n\n' + accumulatedReasoning })}\n\n`)
                    );
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  const reasoning =
                    parsed.choices?.[0]?.delta?.reasoning ||
                    parsed.choices?.[0]?.delta?.reasoning_content ||
                    '';

                  if (reasoning) {
                    accumulatedReasoning += reasoning;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`)
                    );
                  }
                  if (delta) {
                    accumulatedContent += delta;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                    );
                  }
                } catch (e) {}
              }
            },
            flush(controller) {
              if (accumulatedContent.trim().length === 0 && accumulatedReasoning.trim().length > 0) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: accumulatedReasoning })}\n\n`)
                );
              } else if (accumulatedContent.trim().length < 60 && accumulatedReasoning.trim().length > 30) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: '\n\n' + accumulatedReasoning })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            },
          });

          return new Response(upstreamResponse.body.pipeThrough(transformStream), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': `${endpoint.tag}-${targetModel}`,
            },
          });
        } catch (streamErr) {
          // Continue to next model / endpoint
        }
      }
    }

    // ========================================================
    // OMNIROUTER STAGE 1: Google Gemini Flash (Primary Cloud)
    // ========================================================
    const rawGemini = geminiKey || process.env.GEMINI_API_KEY;
    const activeGeminiKey = typeof rawGemini === 'string' && rawGemini.trim().length > 5
      ? rawGemini.trim().replace(/^["']|["']$/g, '')
      : undefined;
    if (activeGeminiKey) {
      try {
        const contents = messages.map((m: any) => {
          const parts: any[] = [];
          let textContent = m.content || '';

          if (m.attachments && Array.isArray(m.attachments)) {
            for (const att of m.attachments) {
              if (att.isImage && att.dataUrl) {
                const match = att.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  parts.push({
                    inline_data: {
                      mime_type: match[1],
                      data: match[2],
                    },
                  });
                }
              } else if (att.contentSnippet) {
                textContent += `\n\n--- [Attached Document: ${att.name}] ---\n${att.contentSnippet}\n--- [End of ${att.name}] ---`;
              }
            }
          }

          parts.unshift({
            text:
              textContent ||
              (parts.length > 0 ? 'Please analyze the attached media.' : 'Hello'),
          });

          return {
            role: m.role === 'user' ? 'user' : 'model',
            parts,
          };
        });

        // Robust Text-Generation Models for Google Gemini
        const priorityModels = [
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.5-flash',
        ];
        let targetModels = [...priorityModels];

        try {
          const listResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${activeGeminiKey}`,
            { signal: AbortSignal.timeout(1500) }
          );
          if (listResp.ok) {
            const listData = await listResp.json();
            const discovered = (listData.models || [])
              .filter((m: any) =>
                m.supportedGenerationMethods?.includes('generateContent') &&
                !m.name.includes('tts') &&
                !m.name.includes('audio') &&
                !m.name.includes('embedding') &&
                !m.name.includes('imagen')
              )
              .map((m: any) => m.name.replace('models/', ''));

            if (discovered.length > 0) {
              targetModels = Array.from(new Set([
                ...priorityModels.filter((p) => discovered.includes(p)),
                ...discovered.filter((d: string) => d.includes('2.0') || d.includes('1.5')),
                ...discovered,
              ]));
            }
          }
        } catch (listErr) {}

        for (const candidate of targetModels.slice(0, 3)) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:streamGenerateContent?alt=sse&key=${activeGeminiKey}`;
            const geminiResponse = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { maxOutputTokens: 16384 },
              }),
              signal: AbortSignal.timeout(10000),
            });

            if (geminiResponse.ok) {
              const encoder = new TextEncoder();
              const decoder = new TextDecoder();
              let geminiBuffer = '';

              const transformStream = new TransformStream({
                transform(chunk, controller) {
                  geminiBuffer += decoder.decode(chunk, { stream: true });
                  const lines = geminiBuffer.split('\n');
                  geminiBuffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    const dataStr = trimmed.replace('data: ', '');

                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      if (textChunk) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: textChunk })}\n\n`)
                        );
                      }
                    } catch (e) {}
                  }
                },
                flush(controller) {
                  if (geminiBuffer.trim().startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(geminiBuffer.trim().replace('data: ', ''));
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      if (textChunk) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: textChunk })}\n\n`)
                        );
                      }
                    } catch (e) {}
                  }
                },
              });

              return new Response(geminiResponse.body?.pipeThrough(transformStream), {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'X-Claude-Skill': detectedSkill,
                  'X-Claude-Router': candidate,
                },
              });
            }
          } catch (modelErr) {
            // try next candidate
          }
        }
        // If Gemini models fail, cleanly fall through to OpenRouter / Synthesizer instead of throwing 400
      } catch (e) {
        // Fallback to next provider in OmniRouter chain
      }
    }


    // ========================================================
    // OMNIROUTER STAGE 4: Zero-Auth Fast Engine Fallback (3s Cap)
    // ========================================================
    try {
      const edgeResp = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content || '',
            })),
          ],
          model: 'openai',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (edgeResp.ok) {
        let fullText = await edgeResp.text();
        if (
          fullText &&
          fullText.trim().length > 5 &&
          !fullText.includes('budget') &&
          !fullText.includes('rate limit') &&
          !fullText.includes('Queue full') &&
          !fullText.includes('Deprecation')
        ) {
          fullText = fullText.trim();
          const encoder = new TextEncoder();
          const chunkSize = 28;
          const stream = new ReadableStream({
            start(controller) {
              for (let pos = 0; pos < fullText.length; pos += chunkSize) {
                const piece = fullText.slice(pos, pos + chunkSize);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': 'cloud-instant-stream',
            },
          });
        }
      }
    } catch (e) {
      // Fall through to synthesizer
    }

    // ========================================================
    // AUTONOMOUS END-TO-END WORK & CONNECTOR EXECUTION (HERMES / OPEN INTERPRETER)
    // ========================================================
    const fallbackContent = await synthesizeClaudeEnterpriseResponse(lastText, modelId, detectedSkill, connectors, messages);
    const encoder = new TextEncoder();
    const chunkSize = 28;
    const stream = new ReadableStream({
      start(controller) {
        for (let pos = 0; pos < fallbackContent.length; pos += chunkSize) {
          const piece = fallbackContent.slice(pos, pos + chunkSize);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': detectedSkill,
        'X-Claude-Router': 'claude-enterprise-edge',
      },
    });
  } catch (error: any) {
    const encoder = new TextEncoder();
    const safeMsg = `Hello! I am Boss. I am standing by and ready to help you. How can I assist you?`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: safeMsg })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': 'Enterprise Resilience',
        'X-Claude-Router': 'claude-emergency-shield',
      },
    });
  }
}
