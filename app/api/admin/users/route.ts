import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileRow = {
  id: string;
  username: string;
  role: string;
  house: string | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error('Missing Supabase env variables for admin users API');
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function requireOwner(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';

  // Primary path: validate authenticated Supabase bearer token
  if (token) {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (!authError && authData?.user) {
      const requesterId = authData.user.id;
      const { data: requesterProfile, error: requesterProfileError } = await admin
        .from('profiles')
        .select('id, role, house')
        .eq('id', requesterId)
        .single();

      if (!requesterProfileError && requesterProfile) {
        const role = String((requesterProfile as any).role || '').toLowerCase();
        if (role === 'owner' || role === 'dueno') {
          return { requester: requesterProfile as { id: string; role: string; house?: string | null } };
        }
      }
    }
  }

  // Fallback path for local dashboard sessions: trust current owner username/role headers,
  // but still verify against profiles table before allowing admin actions.
  const roleHeader = String(request.headers.get('x-dashboard-user-role') || '').toLowerCase();
  const usernameHeader = String(request.headers.get('x-dashboard-user-name') || '').trim();

  if ((roleHeader === 'owner' || roleHeader === 'dueno') && usernameHeader) {
    const { data: requesterProfile, error: requesterProfileError } = await admin
      .from('profiles')
      .select('id, role, house, username')
      .ilike('username', usernameHeader)
      .single();

    if (!requesterProfileError && requesterProfile) {
      const role = String((requesterProfile as any).role || '').toLowerCase();
      if (role === 'owner' || role === 'dueno') {
        return { requester: requesterProfile as { id: string; role: string; house?: string | null } };
      }
    }
  }

  return { error: NextResponse.json({ error: 'Unauthorized: owner session required' }, { status: 401 }) };
}

export async function GET(request: NextRequest) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;

  try {
    const { data: profilesData, error: profilesError } = await admin
      .from('profiles')
      .select('id, username, role, house')
      .order('username', { ascending: true });

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 400 });
    }

    const { data: authUsersData, error: authUsersError } = await admin.auth.admin.listUsers({ perPage: 1000 });

    const emailMap: Record<string, string> = {};
    if (!authUsersError && authUsersData?.users) {
      for (const authUser of authUsersData.users) {
        emailMap[authUser.id] = authUser.email || '';
      }
    }

    const users = (profilesData || []).map((p: any) => ({
      id: p.id,
      username: p.username,
      role: p.role,
      house: p.house,
      email: emailMap[p.id] || '',
      password: ''
    }));

    return NextResponse.json({ ok: true, users });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();
    const username = String(body?.username || '').trim();
    const role = String(body?.role || 'empleado').trim();
    const house = String(body?.house || '').trim();

    if (!email || !password || !username || !role || !house) {
      return NextResponse.json({ error: 'Missing required fields: email, password, username, role, house' }, { status: 400 });
    }

    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (created.error || !created.data?.user) {
      return NextResponse.json({ error: created.error?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const userId = created.data.user.id;
    const { data: insertedProfile, error: profileError } = await admin
      .from('profiles')
      .insert({ id: userId, username, role, house })
      .select('id, username, role, house')
      .single();

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const user = {
      id: insertedProfile.id,
      username: insertedProfile.username,
      role: insertedProfile.role,
      house: insertedProfile.house,
      password: ''
    };

    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    const username = String(body?.username || '').trim();
    const role = String(body?.role || '').trim();
    const house = String(body?.house || '').trim();
    const password = String(body?.password || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();

    if (!id || !username || !role || !house) {
      return NextResponse.json({ error: 'Missing required fields: id, username, role, house' }, { status: 400 });
    }

    const { data: oldProfile } = await admin
      .from('profiles')
      .select('id, username')
      .eq('id', id)
      .single();

    const oldUsername = String((oldProfile as any)?.username || '');

    const { data: updatedProfile, error: updateError } = await admin
      .from('profiles')
      .update({ username, role, house })
      .eq('id', id)
      .select('id, username, role, house')
      .single();

    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: updateError?.message || 'Failed to update profile' }, { status: 400 });
    }

    if (password) {
      const pwdUpdate = await admin.auth.admin.updateUserById(id, { password });
      if (pwdUpdate.error) {
        return NextResponse.json({ error: `Profile updated, but password failed: ${pwdUpdate.error.message}` }, { status: 400 });
      }
    }

    if (email) {
      const emailUpdate = await admin.auth.admin.updateUserById(id, { email });
      if (emailUpdate.error) {
        return NextResponse.json({ error: `Profile updated, but email failed: ${emailUpdate.error.message}` }, { status: 400 });
      }
    }

    if (oldUsername && oldUsername !== username) {
      await admin.from('calendar_assignments').update({ employee: username }).eq('employee', oldUsername);
      await admin.from('tasks').update({ assigned_to: username }).eq('assigned_to', oldUsername);
      await admin.from('cleaning_checklist').update({ employee: username }).eq('employee', oldUsername);
      await admin.from('assignment_inventory').update({ employee: username }).eq('employee', oldUsername);
      await admin.from('shopping_list').update({ added_by: username }).eq('added_by', oldUsername);
      await admin.from('shopping_list').update({ purchased_by: username }).eq('purchased_by', oldUsername);
    }

    const user = {
      id: updatedProfile.id,
      username: updatedProfile.username,
      role: updatedProfile.role,
      house: updatedProfile.house,
      password: ''
    };

    return NextResponse.json({ ok: true, user });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOwner(request);
  if ('error' in auth) return auth.error;

  try {
    const body = await request.json();
    const id = String(body?.id || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    const { data: targetProfile, error: targetProfileError } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const targetRole = String((targetProfile as any).role || '').toLowerCase();
    if (targetRole === 'owner' || targetRole === 'dueno') {
      return NextResponse.json({ error: 'Cannot delete owner users' }, { status: 400 });
    }

    await admin.from('profiles').delete().eq('id', id);
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) {
      return NextResponse.json({ error: deleted.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
