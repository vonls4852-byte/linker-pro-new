import { Redis } from '@upstash/redis';
import { User, Post, Chat, Message, FriendRequest } from '../types';

// Создаём клиент Redis из переменных окружения Railway
const redis = Redis.fromEnv();

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function log(level: 'info' | 'success' | 'error' | 'debug', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const emoji = {
    info: '🔵',
    success: '✅',
    error: '❌',
    debug: '🔍'
  }[level];
  
  console.log(`${emoji} [${timestamp}] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

// ==================== БАЗОВЫЕ ОПЕРАЦИИ ====================

// Сохранение пользователя
export async function saveUser(user: User) {
  log('info', 'НАЧАЛО СОХРАНЕНИЯ ПОЛЬЗОВАТЕЛЯ', {
    id: user.id,
    nickname: user.nickname,
    phone: user.phone,
    email: user.email
  });
  
  try {
    // Сохраняем по ID
    await redis.set(`user:id:${user.id}`, JSON.stringify(user));
    log('success', 'user:id сохранён');

    // Сохраняем по никнейму
    await redis.set(`user:nickname:${user.nickname}`, user.id);
    log('success', 'user:nickname сохранён');

    // Сохраняем по телефону
    await redis.set(`user:phone:${user.phone}`, user.id);
    log('success', 'user:phone сохранён');

    // Сохраняем по email (если есть)
    if (user.email) {
      await redis.set(`user:email:${user.email}`, user.id);
      log('success', 'user:email сохранён');
    }

    // Добавляем в общий список
    await redis.sadd('users:all', user.id);
    log('success', 'users:all обновлён');

    log('success', 'СОХРАНЕНИЕ ЗАВЕРШЕНО УСПЕШНО');
    return true;
    
  } catch (error) {
    log('error', 'ОШИБКА при сохранении пользователя', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

// Получение пользователя по ID
export async function getUserById(id: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по ID', { id });
  try {
    const user = await redis.get(`user:id:${id}`);
    if (user) {
      const parsed = typeof user === 'string' ? JSON.parse(user) : user;
      log('success', 'Пользователь найден по ID', { id });
      return parsed as User;
    }
    log('debug', 'Пользователь не найден по ID', { id });
    return null;
  } catch (error) {
    log('error', 'Ошибка при поиске по ID', { id, error });
    return null;
  }
}

// Получение пользователя по никнейму
export async function getUserByNickname(nickname: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по никнейму', { nickname });
  try {
    const userId = await redis.get(`user:nickname:${nickname}`);
    if (!userId || typeof userId !== 'string') {
      log('debug', 'Никнейм не найден', { nickname });
      return null;
    }
    log('success', 'Никнейм найден', { nickname, userId });
    return await getUserById(userId);
  } catch (error) {
    log('error', 'Ошибка при поиске по никнейму', { nickname, error });
    return null;
  }
}

// Получение пользователя по телефону
export async function getUserByPhone(phone: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по телефону', { phone });
  try {
    const userId = await redis.get(`user:phone:${phone}`);
    if (!userId || typeof userId !== 'string') {
      log('debug', 'Телефон не найден', { phone });
      return null;
    }
    log('success', 'Телефон найден', { phone, userId });
    return await getUserById(userId);
  } catch (error) {
    log('error', 'Ошибка при поиске по телефону', { phone, error });
    return null;
  }
}

// Получение пользователя по email
export async function getUserByEmail(email: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по email', { email });
  try {
    const userId = await redis.get(`user:email:${email}`);
    if (!userId || typeof userId !== 'string') {
      log('debug', 'Email не найден', { email });
      return null;
    }
    log('success', 'Email найден', { email, userId });
    return await getUserById(userId);
  } catch (error) {
    log('error', 'Ошибка при поиске по email', { email, error });
    return null;
  }
}

// Обновление пользователя
export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  log('info', 'Обновление пользователя', { id, ...data });
  try {
    const user = await getUserById(id);
    if (!user) {
      log('error', 'Пользователь не найден для обновления', { id });
      return null;
    }
    const updated = { ...user, ...data };
    await redis.set(`user:id:${id}`, JSON.stringify(updated));
    log('success', 'Пользователь обновлён', { id });
    return updated;
  } catch (error) {
    log('error', 'Ошибка при обновлении', { id, error });
    return null;
  }
}

// Получение всех пользователей (без паролей)
export async function getAllUsers(): Promise<Partial<User>[]> {
  log('debug', 'Получение всех пользователей');
  try {
    const ids = await redis.smembers('users:all');
    const users = [];
    
    for (const id of ids) {
      if (typeof id === 'string') {
        const user = await getUserById(id);
        if (user) {
          const { password, ...safeUser } = user;
          users.push(safeUser);
        }
      }
    }
    
    log('success', 'Получены все пользователи', { count: users.length });
    return users;
  } catch (error) {
    log('error', 'Ошибка при получении всех пользователей', { error });
    return [];
  }
}

// Поиск пользователей
export async function searchUsers(query: string): Promise<Partial<User>[]> {
  log('debug', 'Поиск пользователей', { query });
  try {
    const ids = await redis.smembers('users:all');
    const users = [];
    
    for (const id of ids) {
      if (typeof id === 'string') {
        const user = await getUserById(id);
        if (user) {
          if (
            user.nickname.toLowerCase().includes(query.toLowerCase()) ||
            user.fullName.toLowerCase().includes(query.toLowerCase())
          ) {
            const { password, ...safeUser } = user;
            users.push(safeUser);
          }
        }
      }
    }
    
    log('success', 'Поиск завершён', { query, found: users.length });
    return users.slice(0, 10);
  } catch (error) {
    log('error', 'Ошибка при поиске', { query, error });
    return [];
  }
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ ====================
// (posts, chats, friends - оставляем как есть, только заменяем kv на redis)

// Сохранить пост
export async function savePost(post: Post) {
  log('info', 'Сохранение поста', { postId: post.id, userId: post.userId });
  try {
    await redis.set(`post:${post.id}`, JSON.stringify(post));
    await redis.sadd(`posts:user:${post.userId}`, post.id);
    await redis.sadd('posts:all', post.id);
    log('success', 'Пост сохранён', { postId: post.id });
  } catch (error) {
    log('error', 'Ошибка при сохранении поста', { postId: post.id, error });
  }
}

// Получить посты пользователя
export async function getUserPosts(userId: string): Promise<Post[]> {
  log('debug', 'Получение постов пользователя', { userId });
  try {
    const postIds = await redis.smembers(`posts:user:${userId}`);
    const posts = [];
    
    for (const id of postIds) {
      if (typeof id === 'string') {
        const post = await redis.get(`post:${id}`);
        if (post) {
          const parsed = typeof post === 'string' ? JSON.parse(post) : post;
          posts.push(parsed as Post);
        }
      }
    }
    
    const sorted = posts.sort((a, b) => b.createdAt - a.createdAt);
    log('success', 'Посты пользователя получены', { userId, count: sorted.length });
    return sorted;
  } catch (error) {
    log('error', 'Ошибка при получении постов', { userId, error });
    return [];
  }
}

// Получить ленту
export async function getFeed(userId: string): Promise<Post[]> {
  log('debug', 'Получение ленты', { userId });
  try {
    const postIds = await redis.smembers('posts:all');
    const posts = [];
    
    for (const id of postIds) {
      if (typeof id === 'string') {
        const post = await redis.get(`post:${id}`);
        if (post) {
          const parsed = typeof post === 'string' ? JSON.parse(post) : post;
          posts.push(parsed as Post);
        }
      }
    }
    
    const sorted = posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
    log('success', 'Лента получена', { userId, count: sorted.length });
    return sorted;
  } catch (error) {
    log('error', 'Ошибка при получении ленты', { userId, error });
    return [];
  }
}

// Лайк поста
export async function likePost(postId: string, userId: string): Promise<Post | null> {
  log('info', 'Лайк поста', { postId, userId });
  try {
    const post = await redis.get(`post:${postId}`);
    if (!post) {
      log('error', 'Пост не найден', { postId });
      return null;
    }
    
    const postData = typeof post === 'string' ? JSON.parse(post) : post as Post;
    const likes = postData.likes || [];
    
    if (likes.includes(userId)) {
      postData.likes = likes.filter((id: string) => id !== userId);
      log('info', 'Лайк убран', { postId, userId });
    } else {
      postData.likes = [...likes, userId];
      log('info', 'Лайк добавлен', { postId, userId });
    }
    
    await redis.set(`post:${postId}`, JSON.stringify(postData));
    log('success', 'Пост обновлён', { postId });
    return postData;
  } catch (error) {
    log('error', 'Ошибка при лайке', { postId, userId, error });
    return null;
  }
}

// Добавить комментарий
export async function addComment(postId: string, comment: any): Promise<Post | null> {
  log('info', 'Добавление комментария', { postId, userId: comment.userId });
  try {
    const post = await redis.get(`post:${postId}`);
    if (!post) {
      log('error', 'Пост не найден', { postId });
      return null;
    }
    
    const postData = typeof post === 'string' ? JSON.parse(post) : post as Post;
    postData.comments = [...(postData.comments || []), comment];
    await redis.set(`post:${postId}`, JSON.stringify(postData));
    log('success', 'Комментарий добавлен', { postId, commentId: comment.id });
    return postData;
  } catch (error) {
    log('error', 'Ошибка при добавлении комментария', { postId, error });
    return null;
  }
}

// ==================== ЧАТЫ (кратко, остальное аналогично) ====================

// Сохранить чат
export async function saveChat(chat: Chat) {
  try {
    await redis.set(`chat:${chat.id}`, JSON.stringify(chat));
    for (const participantId of chat.participants) {
      await redis.sadd(`chats:user:${participantId}`, chat.id);
    }
  } catch (error) {
    log('error', 'Ошибка при сохранении чата', { chatId: chat.id, error });
  }
}

// ==================== ЭКСПОРТЫ ====================
export { redis };