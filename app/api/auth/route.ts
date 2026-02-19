import { NextResponse } from 'next/server';
import { saveUser, getUserByNickname, getUserByPhone, getUserByEmail } from '../../lib/kv';
import bcrypt from 'bcryptjs';
import { User } from '../../types';

export async function POST(request: Request) {
  try {
    console.log('🔵 API /api/auth вызван');
    
    const body = await request.json();
    console.log('📥 Тело запроса:', body);

    // ===== РЕГИСТРАЦИЯ =====
    if (body.action === 'register') {
      const { fullName, phone, nickname, email, password } = body;

      console.log('📝 Данные регистрации:', { fullName, phone, nickname, email, password: '***' });

      // Проверка обязательных полей
      if (!fullName || !phone || !nickname || !password) {
        console.log('❌ Ошибка: пустые поля', { fullName, phone, nickname, password });
        return NextResponse.json({
          success: false,
          error: 'Заполните все поля'
        }, { status: 400 });
      }

      // Проверка на существование
      const existingByNickname = await getUserByNickname(nickname);
      const existingByPhone = await getUserByPhone(phone);
      
      if (existingByNickname || existingByPhone) {
        console.log('❌ Пользователь уже существует');
        return NextResponse.json({
          success: false,
          error: 'Пользователь с таким никнеймом или телефоном уже существует'
        }, { status: 409 });
      }

      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем нового пользователя
      const userId = Date.now().toString();
      const newUser: User = {
        id: userId,
        fullName,
        phone,
        nickname,
        email: email || null,
        password: hashedPassword,
        avatarUrl: null,
        bio: '',
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

      console.log('✅ Создан пользователь:', { id: newUser.id, fullName: newUser.fullName, nickname: newUser.nickname });

      // Сохраняем в KV
      await saveUser(newUser);

      // Не отправляем пароль
      const { password: _, ...userWithoutPassword } = newUser;

      return NextResponse.json({
        success: true,
        message: 'Регистрация успешна',
        user: userWithoutPassword
      }, { status: 201 });
    }

    // ===== ВХОД =====
    if (body.action === 'login') {
      const { phone, nickname, email, password } = body;

      console.log('🔍 Поиск пользователя...', { phone, nickname, email });

      let user = null;

      // Ищем пользователя
      if (phone) {
        console.log('Поиск по телефону:', phone);
        user = await getUserByPhone(phone);
      } else if (nickname) {
        console.log('Поиск по никнейму:', nickname);
        user = await getUserByNickname(nickname);
      } else if (email) {
        console.log('Поиск по email:', email);
        user = await getUserByEmail(email);
      }

      if (!user) {
        console.log('❌ Пользователь не найден в базе');
        return NextResponse.json({
          success: false,
          error: 'Пользователь не найден'
        }, { status: 404 });
      }

      console.log('✅ Пользователь найден:', user.nickname);
      console.log('Проверка пароля...');

      // Проверяем пароль
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log('❌ Неверный пароль');
        return NextResponse.json({
          success: false,
          error: 'Неверный пароль'
        }, { status: 401 });
      }

      console.log('✅ Пароль верный, вход выполнен');

      // Обновляем lastActive
      user.lastActive = Date.now();
      await saveUser(user);

      // Не отправляем пароль
      const { password: _, ...userWithoutPassword } = user;

      return NextResponse.json({
        success: true,
        message: 'Вход выполнен успешно',
        user: userWithoutPassword
      }, { status: 200 });
    }

    return NextResponse.json({
      success: false,
      error: 'Неизвестное действие'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Ошибка сервера:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}