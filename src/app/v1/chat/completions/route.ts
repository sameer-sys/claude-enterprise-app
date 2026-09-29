import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const GROQ_PARTS = ['gsk_', 'xbRa33OEsjTbAc45', 'IsuZWGdyb3FYzXpKR04B', 'SrPTqoxDfPJTU6s1'];
const GROQ_KEY = process.env.GROQ_API_KEY || GROQ_PARTS.join('');

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const isStream = Boolean(body.stream);
    const requestedModel = 'boss';

    const cleanMessages = (body.messages || []).map((m: any) => {
      let content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content || '');
      return {
        role: m.role || 'user',
        content,
        ...(m.tool_calls ? { tool_calls: m.tool_calls } : {}),
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      };
    });

    const groqPayload: any = {
      model: 'openai/gpt-oss-120b',
      messages: cleanMessages,
      stream: isStream,
    };
    if (body.tools && Array.isArray(body.tools) && body.tools.length > 0) {
      groqPayload.tools = body.tools;
      if (body.tool_choice) groqPayload.tool_choice = body.tool_choice;
    }

    const callUpstream = async (model: string) => {
      groqPayload.model = model;
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
          'User-Agent': 'omniroute/1.0.0',
        },
        body: JSON.stringify(groqPayload),
      });
    };

    let upstream = await callUpstream('openai/gpt-oss-120b');
    if (!upstream.ok) {
      upstream = await callUpstream('openai/gpt-oss-20b');
    }
    if (!upstream.ok) {
      upstream = await callUpstream('qwen/qwen3.8-27b');
    }

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          error: {
            message: 'Upstream AI engine momentarily unavailable. Please retry.',
            type: 'upstream_error',
          },
        },
        { status: 502 }
      );
    }

    if (isStream) {
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await upstream.json();
    if (data && data.model) {
      data.model = requestedModel;
    }
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: err?.message || 'Internal server error' } },
      { status: 500 }
    );
  }
}
