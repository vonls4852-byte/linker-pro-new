import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    env: {
      hasKVUrl: !!process.env.KV_URL,
      hasKVRestUrl: !!process.env.KV_REST_API_URL,
      hasKVToken: !!process.env.KV_REST_API_TOKEN,
    },
    tests: {}
  };

  try {
    // Тест 1: Простая запись
    await kv.set('test:connection', 'ok');
    const test1 = await kv.get('test:connection');
    results.tests.basic = { success: true, value: test1 };

    // Тест 2: Работа с числами
    await kv.set('test:number', 42);
    const test2 = await kv.get('test:number');
    results.tests.number = { success: true, value: test2 };

    // Тест 3: Работа с объектами
    const obj = { name: 'test', date: Date.now() };
    await kv.set('test:object', obj);
    const test3 = await kv.get('test:object');
    results.tests.object = { success: true, value: test3 };

    // Тест 4: Работа с множествами
    await kv.sadd('test:set', 'a', 'b', 'c');
    const test4 = await kv.smembers('test:set');
    results.tests.set = { success: true, value: test4 };

    // Очистка тестовых данных
    await kv.del('test:connection');
    await kv.del('test:number');
    await kv.del('test:object');
    await kv.del('test:set');

    results.success = true;

  } catch (error) {
    results.success = false;
    results.error = String(error);
    results.errorDetails = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;
  }

  return NextResponse.json(results);
}