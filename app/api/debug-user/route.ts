import { NextResponse } from 'next/server';
import { getUserByNickname, getUserByPhone, getUserByEmail, getAllUsers } from '../../lib/kv';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nickname = searchParams.get('nickname');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');

    const result: any = {
      timestamp: new Date().toISOString(),
      queries: {}
    };

    // Проверяем конкретного пользователя
    if (nickname) {
      const user = await getUserByNickname(nickname);
      result.queries.byNickname = user ? {
        found: true,
        id: user.id,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email
      } : { found: false };
    }

    if (phone) {
      const user = await getUserByPhone(phone);
      result.queries.byPhone = user ? {
        found: true,
        id: user.id,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email
      } : { found: false };
    }

    if (email) {
      const user = await getUserByEmail(email);
      result.queries.byEmail = user ? {
        found: true,
        id: user.id,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email
      } : { found: false };
    }

    // Получаем всех пользователей для проверки
    const allUsers = await getAllUsers();
    result.allUsers = allUsers.map(u => ({
      id: u.id,
      nickname: u.nickname,
      phone: u.phone,
      email: u.email
    }));
    result.totalUsers = allUsers.length;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}