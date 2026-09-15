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

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId = 'claude-3-7-sonnet', geminiKey, openRouterKey, thinkingBudget = 16000 } = await req.json();

    const systemPrompt =
      SYSTEM_PROMPTS[modelId as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS['claude-3-7-sonnet'];

    // 1. If user provided a Gemini Key, route directly via Google Gemini 2.0 Flash (1,500 free reqs/day!)
    const activeGeminiKey = geminiKey || process.env.GEMINI_API_KEY;
    if (activeGeminiKey) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${activeGeminiKey}`;

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

        // Ensure there is at least one text part
        parts.unshift({ text: textContent || (parts.length > 0 ? 'Please analyze the attached image/file.' : 'Hello') });

        return {
          role: m.role === 'user' ? 'user' : 'model',
          parts,
        };
      });

      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
        }),
      });

      if (!geminiResponse.ok) {
        const errText = await geminiResponse.text();
        return new NextResponse(errText, { status: geminiResponse.status });
      }

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
            } catch (e) {
              // pass
            }
          }
        },
      });

      return new Response(geminiResponse.body?.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // 2. Route via OpenRouter Free
    const activeOrKey = openRouterKey || process.env.OPENROUTER_API_KEY;

    if (!activeOrKey) {
      return new NextResponse(
        JSON.stringify({
          error:
            'Please click "Model & Cloud Quotas" in the sidebar to add your free Google Gemini key (1,500 requests/day, 100% free with no credit card required) or OpenRouter key to start chatting!',
          status: 401,
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const selectedTargetModel =
      OPENROUTER_MODELS[modelId as keyof typeof OPENROUTER_MODELS] || OPENROUTER_MODELS['claude-3-7-sonnet'];

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
        'HTTP-Referer': 'https://boss-ai-cloud.app',
        'X-Title': 'Claude Enterprise Cloud',
      },
      body: JSON.stringify({
        model: selectedTargetModel,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!upstreamResponse.ok) {
      if (upstreamResponse.status === 429) {
        return new NextResponse(
          JSON.stringify({
            error:
              'OpenRouter daily 50-request limit reached for this free account. Click "Model & Cloud Quotas" in the sidebar to add a 100% free Google Gemini key (1,500 requests/day, no credit card required)!',
            status: 429,
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      const errText = await upstreamResponse.text();
      return new NextResponse(errText, { status: upstreamResponse.status });
    }

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
          } catch (e) {
            // pass
          }
        }
      },
    });

    return new Response(upstreamResponse.body?.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new NextResponse(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
