import { NextResponse } from 'next/server';
import { getAllUsers, getUserByNickname } from '../../lib/kv';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    allUsers: [],
    specificUser: null
  };

  try {
    // Получаем всех пользователей
    results.allUsers = await getAllUsers();
    
    // Проверяем конкретного пользователя
    results.specificUser = await getUserByNickname('wyratheplug');
    
    // Добавляем информацию о количестве
    results.count = results.allUsers.length;
    
  } catch (error) {
    results.error = String(error);
  }

  return NextResponse.json(results);
}