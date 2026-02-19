import { NextResponse } from 'next/server';
import { saveUser } from '../../lib/kv';
import bcrypt from 'bcryptjs';
import { User } from '../../types';

export async function GET() {
  try {
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
      role: 'user',  // TypeScript теперь понимает, что это конкретное значение
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

    await saveUser(testUser);
    
    return NextResponse.json({
      success: true,
      message: '✅ Тестовый пользователь создан!',
      user: {
        nickname: testUser.nickname,
        phone: testUser.phone,
        email: testUser.email,
        password: '9daxq7af18c'
      }
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}