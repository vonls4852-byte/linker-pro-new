import { NextResponse } from 'next/server';
import { saveUser } from '../../lib/kv';
import bcrypt from 'bcryptjs';
import { User } from '../../types';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Создаём пользователя
    const testUser: User = {
      id: Date.now().toString(),
      fullName: 'Тестовый Пользователь',
      phone: '89206526999',
      nickname: 'wyratheplug',
      email: 'wyrabeats@gmail.com',
      password: await bcrypt.hash('9daxq7af18c', 10),
      avatarUrl: null,
      bio: 'Тестовый пользователь',
      website: null,
      location: null,
      birthday: null,
      gender: null,
      role: 'user',
      isTester: false,
      testerSince: null,
      experimentsCount: 0,
      testedFeatures: [],
      bugsFound: 0,
      testTime: 0,
      achievements: [],
      testerLevel: 1,
      xp: 0,
      level: 1,
      createdAt: new Date().toISOString(),
      lastActive: Date.now(),
      settings: {
        themeColor: '#3b82f6',
        themeMode: 'dark',
        themeStyle: 'gradient',
        themeBlur: true,
        themeAnimations: true,
        privateAccount: false,
        showBirthday: true,
        showOnline: true,
        readReceipts: true
      }
    };

    results.steps.push('Создан объект пользователя');

    // Сохраняем
    await saveUser(testUser);
    results.steps.push('Пользователь сохранён через saveUser');

    // Немедленная проверка
    const { getUserByNickname } = await import('../../lib/kv');
    const check = await getUserByNickname('wyratheplug');
    
    results.finalCheck = check ? {
      found: true,
      id: check.id,
      nickname: check.nickname
    } : { found: false };

    results.success = true;

  } catch (error) {
    results.success = false;
    results.error = String(error);
  }

  return NextResponse.json(results);
}