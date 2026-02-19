import { NextResponse } from 'next/server';
import { getUserById, getAllUsers, updateUser, searchUsers } from '../../lib/kv';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const query = searchParams.get('search');

    if (id) {
      const user = await getUserById(id);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      const { password, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    if (query) {
      const users = await searchUsers(query);
      return NextResponse.json({ users });
    }

    const users = await getAllUsers();
    return NextResponse.json({ users, total: users.length });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, ...data } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const updatedUser = await updateUser(userId, data);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { password, ...safeUser } = updatedUser;
    return NextResponse.json({ success: true, user: safeUser });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}