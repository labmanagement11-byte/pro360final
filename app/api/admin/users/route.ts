import { NextRequest, NextResponse } from 'next/server';

function actionFromMethod(method: string) {
  if (method === 'GET') return 'list';
  if (method === 'POST') return 'create';
  if (method === 'PATCH') return 'update';
  if (method === 'DELETE') return 'delete';
  return 'list';
}

async function proxy(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Falta configuración de Supabase' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No hay sesión activa para gestionar usuarios' }, { status: 401 });
    }

    let payload: Record<string, unknown> = {};
    if (request.method !== 'GET') {
      payload = await request.json().catch(() => ({}));
    }

    const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: actionFromMethod(request.method), ...payload }),
    });

    const json = await res.json().catch(() => ({ error: 'Respuesta inválida al crear o borrar usuario' }));
    return NextResponse.json(json, { status: res.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error inesperado';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}
