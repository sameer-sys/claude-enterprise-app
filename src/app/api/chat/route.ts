import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const OPENROUTER_MODELS = {
  'claude-3-7-sonnet': 'qwen/qwen-2.5-coder-32b-instruct:free',
  'claude-3-5-sonnet': 'nvidia/nemotron-3.5-lightning:free',
  'claude-3-5-haiku': 'meta-llama/llama-3.3-70b-instruct:free',
  'claude-3-opus': 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
};

const SYSTEM_PROMPTS = {
  'claude-3-7-sonnet':
    'You are Claude 3.7 Sonnet Enterprise — Anthropic’s flagship hybrid reasoning model. Provide exceptional depth, rigorous multi-step analysis, complete robust code implementations, and nuanced architectural guidance.',
  'claude-3-5-sonnet':
    'You are Claude 3.5 Sonnet — thoughtful, direct, and exceptionally capable AI. Reply with clear, elegant prose, nuanced reasoning, and deep assistance.',
  'claude-3-5-haiku':
    'You are Claude 3.5 Haiku — fast, precise, and concise AI. Provide immediate, accurate answers with clean formatting.',
  'claude-3-opus':
    'You are Claude 3 Opus — master author and insightful thinker. Provide rich, structured, and eloquently written thoughts.',
};

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

export async function POST(req: NextRequest) {
  try {
    const {
      messages,
      modelId = 'claude-3-7-sonnet',
      geminiKey,
      openRouterKey,
      omniRouteUrl,
      thinkingBudget = 16000,
    } = await req.json();

    const systemPrompt =
      SYSTEM_PROMPTS[modelId as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS['claude-3-7-sonnet'];

    const userLastMsg = messages[messages.length - 1];
    const lastText = typeof userLastMsg?.content === 'string' ? userLastMsg.content : '';
    const hasImages =
      userLastMsg?.attachments?.some((a: any) => a.isImage && a.dataUrl) || false;
    const detectedSkill = detectSkill(lastText, hasImages);

    // ========================================================
    // OMNIROUTER STAGE 1: Google Gemini 2.0 Flash (Primary)
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

        const GEMINI_MODELS = [
          'gemini-2.5-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.0-flash',
          'gemini-2.0-flash-exp',
        ];

        let lastGeminiError = '';

        for (const candidate of GEMINI_MODELS) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:streamGenerateContent?alt=sse&key=${activeGeminiKey}`;
            const geminiResponse = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents,
              }),
            });

            if (geminiResponse.ok) {
              const encoder = new TextEncoder();
              const decoder = new TextDecoder();

              const transformStream = new TransformStream({
                async transform(chunk, controller) {
                  const text = decoder.decode(chunk);
                  const lines = text.split('\n');

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
            } else {
              const errBody = await geminiResponse.json().catch(() => null);
              lastGeminiError = errBody?.error?.message || `HTTP ${geminiResponse.status}`;
            }
          } catch (modelErr) {
            // try next candidate
          }
        }

        if (lastGeminiError) {
          return new NextResponse(
            JSON.stringify({
              error: `Gemini Key Notice: ${lastGeminiError}. Please click Settings to check your key or create a free key at https://aistudio.google.com/app/apikey`,
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        // Fallback to next provider in OmniRouter chain
      }
    }

    // ========================================================
    // OMNIROUTER STAGE 2: Local / Custom OmniRoute Server
    // ========================================================
    const targetOmniUrl =
      omniRouteUrl || process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1/chat/completions';
    try {
      const omniResp = await fetch(targetOmniUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-omniroute-active',
        },
        body: JSON.stringify({
          model: 'auto/claude-sonnet',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
          ],
          stream: true,
        }),
      });

      if (omniResp.ok) {
        return new Response(omniResp.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Claude-Skill': detectedSkill,
            'X-Claude-Router': 'omniroute-local',
          },
        });
      }
    } catch (e) {
      // Fallback to next provider in OmniRouter chain
    }

    // ========================================================
    // OMNIROUTER STAGE 3: OpenRouter Free Pool
    // ========================================================
    const rawOrKey = openRouterKey || process.env.OPENROUTER_API_KEY;
    const activeOrKey = typeof rawOrKey === 'string' && rawOrKey.trim().length > 5
      ? rawOrKey.trim().replace(/^["']|["']$/g, '')
      : undefined;
    if (activeOrKey) {
      try {
        const selectedTargetModel =
          OPENROUTER_MODELS[modelId as keyof typeof OPENROUTER_MODELS] ||
          OPENROUTER_MODELS['claude-3-7-sonnet'];

        const fullMessages = [
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

        const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeOrKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://claude-enterprise-app.vercel.app',
            'X-Title': 'Claude Enterprise Cloud',
          },
          body: JSON.stringify({
            model: selectedTargetModel,
            messages: fullMessages,
            stream: true,
          }),
        });

        if (upstreamResponse.ok) {
          const encoder = new TextEncoder();
          const decoder = new TextDecoder();

          const transformStream = new TransformStream({
            async transform(chunk, controller) {
              const text = decoder.decode(chunk);
              const lines = text.split('\n');

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.replace('data: ', '');
                if (dataStr === '[DONE]') {
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  if (delta) {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                    );
                  }
                } catch (e) {}
              }
            },
          });

          return new Response(upstreamResponse.body?.pipeThrough(transformStream), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': 'openrouter-free',
            },
          });
        }
      } catch (e) {
        // Fallback to next provider in OmniRouter chain
      }
    }

    // ========================================================
    // OMNIROUTER STAGE 4: Zero-Auth Cloud Edge Safety Fallback
    // ========================================================
    try {
      const fallbackPrompt = messages
        .map((m: any) => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
        .join('\n\n');
      const edgeUrl = `https://text.pollinations.ai/${encodeURIComponent(
        `${systemPrompt}\n\n${fallbackPrompt}\n\nAssistant:`
      )}?model=qwen-coder&seed=${Date.now()}`;

      const edgeResp = await fetch(edgeUrl);
      if (edgeResp.ok) {
        const fullText = await edgeResp.text();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          start(controller) {
            // Emulate streaming for silky smooth display
            const words = fullText.split(' ');
            let i = 0;
            const interval = setInterval(() => {
              if (i < words.length) {
                const chunk = (i === 0 ? '' : ' ') + words[i];
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
                );
                i++;
              } else {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                clearInterval(interval);
              }
            }, 30);
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
            'X-Claude-Skill': detectedSkill,
            'X-Claude-Router': 'cloud-edge-safety',
          },
        });
      }
    } catch (e) {}

    return new NextResponse(
      JSON.stringify({
        error:
          'Please click "Settings" in the sidebar to add your free Google Gemini Key (1,500 free daily requests, zero credit card) or OpenRouter key to enable instant high-speed responses!',
      }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
