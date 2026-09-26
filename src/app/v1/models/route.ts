import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const models = [
    {
      id: 'boss',
      object: 'model',
      name: 'The Boss',
      created: 1789421445,
      owned_by: 'boss-ai',
      permission: [],
      root: 'boss',
      parent: null,
    },
  ];

  return NextResponse.json(
    { object: 'list', data: models },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    }
  );
}

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
