import { kv } from '@vercel/kv';
import { User, Post, Chat, Message, FriendRequest } from '../types';

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
    const idResult = await kv.set(`user:id:${user.id}`, user);
    log('success', 'user:id сохранён', { key: `user:id:${user.id}`, result: idResult });

    // Сохраняем по никнейму
    const nicknameResult = await kv.set(`user:nickname:${user.nickname}`, user.id);
    log('success', 'user:nickname сохранён', { key: `user:nickname:${user.nickname}`, result: nicknameResult });

    // Сохраняем по телефону
    const phoneResult = await kv.set(`user:phone:${user.phone}`, user.id);
    log('success', 'user:phone сохранён', { key: `user:phone:${user.phone}`, result: phoneResult });

    // Сохраняем по email (если есть)
    if (user.email) {
      const emailResult = await kv.set(`user:email:${user.email}`, user.id);
      log('success', 'user:email сохранён', { key: `user:email:${user.email}`, result: emailResult });
    }

    // Добавляем в общий список
    const saddResult = await kv.sadd('users:all', user.id);
    log('success', 'users:all обновлён', { added: saddResult, userId: user.id });

    // ПРЯМАЯ ПРОВЕРКА
    log('debug', 'ПРЯМАЯ ПРОВЕРКА: читаем данные...');

    const checkUser = await kv.get(`user:id:${user.id}`);
    if (checkUser) {
      log('success', 'ПРОВЕРКА: пользователь найден по ID');
    } else {
      log('error', 'ПРОВЕРКА: пользователь НЕ найден по ID');
    }

    const checkNickname = await kv.get(`user:nickname:${user.nickname}`);
    if (checkNickname) {
      log('success', 'ПРОВЕРКА: никнейм найден', { value: checkNickname });
    } else {
      log('error', 'ПРОВЕРКА: никнейм НЕ найден');
    }

    const checkPhone = await kv.get(`user:phone:${user.phone}`);
    if (checkPhone) {
      log('success', 'ПРОВЕРКА: телефон найден', { value: checkPhone });
    } else {
      log('error', 'ПРОВЕРКА: телефон НЕ найден');
    }

    const allUsers = await kv.smembers('users:all');
    log('info', 'ТЕКУЩИЙ СПИСОК ПОЛЬЗОВАТЕЛЕЙ', { 
      count: allUsers.length,
      users: allUsers 
    });

    log('success', 'СОХРАНЕНИЕ ЗАВЕРШЕНО УСПЕШНО');
    return true;
    
  } catch (error) {
    log('error', 'ОШИБКА при сохранении пользователя', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Получение пользователя по ID
export async function getUserById(id: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по ID', { id });
  try {
    const user = await kv.get(`user:id:${id}`);
    if (user) {
      log('success', 'Пользователь найден по ID', { id });
      return user as User;
    } else {
      log('debug', 'Пользователь не найден по ID', { id });
      return null;
    }
  } catch (error) {
    log('error', 'Ошибка при поиске по ID', { id, error });
    return null;
  }
}

// Получение пользователя по никнейму
export async function getUserByNickname(nickname: string): Promise<User | null> {
  log('debug', 'Поиск пользователя по никнейму', { nickname });
  try {
    const userId = await kv.get(`user:nickname:${nickname}`);
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
    const userId = await kv.get(`user:phone:${phone}`);
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
    const userId = await kv.get(`user:email:${email}`);
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
    await kv.set(`user:id:${id}`, updated);
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
    const ids = await kv.smembers('users:all');
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
    const ids = await kv.smembers('users:all');
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

// ==================== ПОСТЫ ====================

// Сохранить пост
export async function savePost(post: Post) {
  log('info', 'Сохранение поста', { postId: post.id, userId: post.userId });
  try {
    await kv.set(`post:${post.id}`, post);
    await kv.sadd(`posts:user:${post.userId}`, post.id);
    await kv.sadd('posts:all', post.id);
    log('success', 'Пост сохранён', { postId: post.id });
  } catch (error) {
    log('error', 'Ошибка при сохранении поста', { postId: post.id, error });
  }
}

// Получить посты пользователя
export async function getUserPosts(userId: string): Promise<Post[]> {
  log('debug', 'Получение постов пользователя', { userId });
  try {
    const postIds = await kv.smembers(`posts:user:${userId}`);
    const posts = [];
    
    for (const id of postIds) {
      if (typeof id === 'string') {
        const post = await kv.get(`post:${id}`);
        if (post) posts.push(post as Post);
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
    const postIds = await kv.smembers('posts:all');
    const posts = [];
    
    for (const id of postIds) {
      if (typeof id === 'string') {
        const post = await kv.get(`post:${id}`);
        if (post) posts.push(post as Post);
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
    const post = await kv.get(`post:${postId}`);
    if (!post) {
      log('error', 'Пост не найден', { postId });
      return null;
    }
    
    const postData = post as Post;
    const likes = postData.likes || [];
    
    if (likes.includes(userId)) {
      postData.likes = likes.filter((id: string) => id !== userId);
      log('info', 'Лайк убран', { postId, userId });
    } else {
      postData.likes = [...likes, userId];
      log('info', 'Лайк добавлен', { postId, userId });
    }
    
    await kv.set(`post:${postId}`, postData);
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
    const post = await kv.get(`post:${postId}`);
    if (!post) {
      log('error', 'Пост не найден', { postId });
      return null;
    }
    
    const postData = post as Post;
    postData.comments = [...(postData.comments || []), comment];
    await kv.set(`post:${postId}`, postData);
    log('success', 'Комментарий добавлен', { postId, commentId: comment.id });
    return postData;
  } catch (error) {
    log('error', 'Ошибка при добавлении комментария', { postId, error });
    return null;
  }
}

// ==================== ЧАТЫ ====================

// Сохранить чат
export async function saveChat(chat: Chat) {
  log('info', 'Сохранение чата', { chatId: chat.id, participants: chat.participants.length });
  try {
    await kv.set(`chat:${chat.id}`, chat);
    
    for (const participantId of chat.participants) {
      await kv.sadd(`chats:user:${participantId}`, chat.id);
    }
    
    log('success', 'Чат сохранён', { chatId: chat.id });
  } catch (error) {
    log('error', 'Ошибка при сохранении чата', { chatId: chat.id, error });
  }
}

// Получить чаты пользователя
export async function getUserChats(userId: string): Promise<Chat[]> {
  log('debug', 'Получение чатов пользователя', { userId });
  try {
    const chatIds = await kv.smembers(`chats:user:${userId}`);
    const chats = [];
    
    for (const id of chatIds) {
      if (typeof id === 'string') {
        const chat = await kv.get(`chat:${id}`);
        if (chat) chats.push(chat as Chat);
      }
    }
    
    const sorted = chats.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || 0;
      return bTime - aTime;
    });
    
    log('success', 'Чаты пользователя получены', { userId, count: sorted.length });
    return sorted;
  } catch (error) {
    log('error', 'Ошибка при получении чатов', { userId, error });
    return [];
  }
}

// Сохранить сообщение
export async function saveMessage(chatId: string, message: Message) {
  log('info', 'Сохранение сообщения', { chatId, messageId: message.id });
  try {
    const messageId = `msg:${chatId}:${message.id}`;
    await kv.set(messageId, message);
    await kv.sadd(`messages:chat:${chatId}`, messageId);
    
    const chat = await kv.get(`chat:${chatId}`);
    if (chat) {
      const chatData = chat as Chat;
      chatData.lastMessage = message;
      await kv.set(`chat:${chatId}`, chatData);
    }
    
    log('success', 'Сообщение сохранено', { chatId, messageId: message.id });
  } catch (error) {
    log('error', 'Ошибка при сохранении сообщения', { chatId, error });
  }
}

// Получить сообщения чата
export async function getChatMessages(chatId: string): Promise<Message[]> {
  log('debug', 'Получение сообщений чата', { chatId });
  try {
    const messageIds = await kv.smembers(`messages:chat:${chatId}`);
    const messages = [];
    
    for (const id of messageIds) {
      if (typeof id === 'string') {
        const msg = await kv.get(id);
        if (msg) messages.push(msg as Message);
      }
    }
    
    const sorted = messages.sort((a, b) => a.createdAt - b.createdAt);
    log('success', 'Сообщения чата получены', { chatId, count: sorted.length });
    return sorted;
  } catch (error) {
    log('error', 'Ошибка при получении сообщений', { chatId, error });
    return [];
  }
}

// ==================== ДРУЗЬЯ ====================

// Отправить заявку
export async function sendFriendRequest(request: FriendRequest) {
  log('info', 'Отправка заявки в друзья', { 
    requestId: request.id,
    from: request.fromUserId,
    to: request.toUserId 
  });
  try {
    await kv.set(`friend:request:${request.id}`, request);
    await kv.sadd(`friend:requests:to:${request.toUserId}`, request.id);
    log('success', 'Заявка отправлена', { requestId: request.id });
  } catch (error) {
    log('error', 'Ошибка при отправке заявки', { requestId: request.id, error });
  }
}

// Получить входящие заявки
export async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
  log('debug', 'Получение входящих заявок', { userId });
  try {
    const requestIds = await kv.smembers(`friend:requests:to:${userId}`);
    const requests = [];
    
    for (const id of requestIds) {
      if (typeof id === 'string') {
        const req = await kv.get(`friend:request:${id}`);
        if (req) {
          const reqData = req as FriendRequest;
          if (reqData.status === 'pending') requests.push(reqData);
        }
      }
    }
    
    log('success', 'Входящие заявки получены', { userId, count: requests.length });
    return requests;
  } catch (error) {
    log('error', 'Ошибка при получении заявок', { userId, error });
    return [];
  }
}

// Принять заявку
export async function acceptFriendRequest(requestId: string): Promise<FriendRequest | null> {
  log('info', 'Принятие заявки в друзья', { requestId });
  try {
    const request = await kv.get(`friend:request:${requestId}`);
    if (!request) {
      log('error', 'Заявка не найдена', { requestId });
      return null;
    }
    
    const requestData = request as FriendRequest;
    requestData.status = 'accepted';
    await kv.set(`friend:request:${requestId}`, requestData);
    
    await kv.sadd(`friends:user:${requestData.fromUserId}`, requestData.toUserId);
    await kv.sadd(`friends:user:${requestData.toUserId}`, requestData.fromUserId);
    
    log('success', 'Заявка принята', { 
      requestId,
      user1: requestData.fromUserId,
      user2: requestData.toUserId 
    });
    
    return requestData;
  } catch (error) {
    log('error', 'Ошибка при принятии заявки', { requestId, error });
    return null;
  }
}

// Отклонить заявку
export async function rejectFriendRequest(requestId: string): Promise<FriendRequest | null> {
  log('info', 'Отклонение заявки', { requestId });
  try {
    const request = await kv.get(`friend:request:${requestId}`);
    if (!request) {
      log('error', 'Заявка не найдена', { requestId });
      return null;
    }
    
    const requestData = request as FriendRequest;
    requestData.status = 'rejected';
    await kv.set(`friend:request:${requestId}`, requestData);
    
    log('success', 'Заявка отклонена', { requestId });
    return requestData;
  } catch (error) {
    log('error', 'Ошибка при отклонении заявки', { requestId, error });
    return null;
  }
}

// Получить друзей пользователя
export async function getUserFriends(userId: string): Promise<Partial<User>[]> {
  log('debug', 'Получение друзей пользователя', { userId });
  try {
    const friendIds = await kv.smembers(`friends:user:${userId}`);
    const friends = [];
    
    for (const id of friendIds) {
      if (typeof id === 'string') {
        const user = await getUserById(id);
        if (user) {
          const { password, ...safeUser } = user;
          friends.push(safeUser);
        }
      }
    }
    
    log('success', 'Друзья получены', { userId, count: friends.length });
    return friends;
  } catch (error) {
    log('error', 'Ошибка при получении друзей', { userId, error });
    return [];
  }
}

// Удалить из друзей
export async function removeFriend(userId: string, friendId: string) {
  log('info', 'Удаление из друзей', { userId, friendId });
  try {
    await kv.srem(`friends:user:${userId}`, friendId);
    await kv.srem(`friends:user:${friendId}`, userId);
    log('success', 'Удалено из друзей', { userId, friendId });
  } catch (error) {
    log('error', 'Ошибка при удалении из друзей', { userId, friendId, error });
  }
}

// ==================== ОНЛАЙН-СТАТУС ====================

// Обновить активность
export async function updateLastActive(userId: string) {
  try {
    await kv.set(`lastactive:${userId}`, Date.now());
  } catch (error) {
    log('error', 'Ошибка при обновлении активности', { userId, error });
  }
}

// Получить последнюю активность
export async function getLastActive(userId: string): Promise<number | null> {
  try {
    return await kv.get(`lastactive:${userId}`);
  } catch (error) {
    log('error', 'Ошибка при получении активности', { userId, error });
    return null;
  }
}

// Получить онлайн-статус нескольких пользователей
export async function getOnlineStatus(userIds: string[]): Promise<Record<string, boolean>> {
  const now = Date.now();
  const status: Record<string, boolean> = {};
  
  for (const userId of userIds) {
    const lastActive = await getLastActive(userId);
    status[userId] = lastActive ? (now - lastActive < 5 * 60 * 1000) : false;
  }
  
  return status;
}