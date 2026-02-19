import { kv } from '@vercel/kv';
import { User, Post, Chat, Message, FriendRequest } from '../types';

// ==================== БАЗОВЫЕ ОПЕРАЦИИ ====================

// Сохранение пользователя
export async function saveUser(user: User) {
  await kv.set(`user:id:${user.id}`, user);
  await kv.set(`user:nickname:${user.nickname}`, user.id);
  await kv.set(`user:phone:${user.phone}`, user.id);
  if (user.email) {
    await kv.set(`user:email:${user.email}`, user.id);
  }
  await kv.sadd('users:all', user.id);
}

// Получение пользователя по ID
export async function getUserById(id: string): Promise<User | null> {
  const user = await kv.get(`user:id:${id}`);
  return user as User | null;
}

// Получение пользователя по никнейму
export async function getUserByNickname(nickname: string): Promise<User | null> {
  const userId = await kv.get(`user:nickname:${nickname}`);
  if (!userId || typeof userId !== 'string') return null;
  return await getUserById(userId);
}

// Получение пользователя по телефону
export async function getUserByPhone(phone: string): Promise<User | null> {
  const userId = await kv.get(`user:phone:${phone}`);
  if (!userId || typeof userId !== 'string') return null;
  return await getUserById(userId);
}

// Получение пользователя по email
export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = await kv.get(`user:email:${email}`);
  if (!userId || typeof userId !== 'string') return null;
  return await getUserById(userId);
}

// Обновление пользователя
export async function updateUser(id: string, data: Partial<User>): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;
  const updated = { ...user, ...data };
  await kv.set(`user:id:${id}`, updated);
  return updated;
}

// Получение всех пользователей (без паролей)
export async function getAllUsers(): Promise<Partial<User>[]> {
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
  return users;
}

// Поиск пользователей
export async function searchUsers(query: string): Promise<Partial<User>[]> {
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
  return users.slice(0, 10);
}

// ==================== ПОСТЫ ====================

// Сохранить пост
export async function savePost(post: Post) {
  await kv.set(`post:${post.id}`, post);
  await kv.sadd(`posts:user:${post.userId}`, post.id);
  await kv.sadd('posts:all', post.id);
}

// Получить посты пользователя
export async function getUserPosts(userId: string): Promise<Post[]> {
  const postIds = await kv.smembers(`posts:user:${userId}`);
  const posts = [];
  for (const id of postIds) {
    if (typeof id === 'string') {
      const post = await kv.get(`post:${id}`);
      if (post) posts.push(post as Post);
    }
  }
  return posts.sort((a, b) => b.createdAt - a.createdAt);
}

// Получить ленту
export async function getFeed(userId: string): Promise<Post[]> {
  const postIds = await kv.smembers('posts:all');
  const posts = [];
  for (const id of postIds) {
    if (typeof id === 'string') {
      const post = await kv.get(`post:${id}`);
      if (post) posts.push(post as Post);
    }
  }
  return posts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
}

// Лайк поста
export async function likePost(postId: string, userId: string): Promise<Post | null> {
  const post = await kv.get(`post:${postId}`);
  if (!post) return null;
  
  const postData = post as Post;
  const likes = postData.likes || [];
  
  if (likes.includes(userId)) {
    postData.likes = likes.filter((id: string) => id !== userId);
  } else {
    postData.likes = [...likes, userId];
  }
  
  await kv.set(`post:${postId}`, postData);
  return postData;
}

// Добавить комментарий
export async function addComment(postId: string, comment: any): Promise<Post | null> {
  const post = await kv.get(`post:${postId}`);
  if (!post) return null;
  
  const postData = post as Post;
  postData.comments = [...(postData.comments || []), comment];
  await kv.set(`post:${postId}`, postData);
  return postData;
}

// ==================== ЧАТЫ ====================

// Сохранить чат
export async function saveChat(chat: Chat) {
  await kv.set(`chat:${chat.id}`, chat);
  
  // Добавляем чат каждому участнику
  for (const participantId of chat.participants) {
    await kv.sadd(`chats:user:${participantId}`, chat.id);
  }
}

// Получить чаты пользователя
export async function getUserChats(userId: string): Promise<Chat[]> {
  const chatIds = await kv.smembers(`chats:user:${userId}`);
  const chats = [];
  for (const id of chatIds) {
    if (typeof id === 'string') {
      const chat = await kv.get(`chat:${id}`);
      if (chat) chats.push(chat as Chat);
    }
  }
  return chats.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt || 0;
    const bTime = b.lastMessage?.createdAt || 0;
    return bTime - aTime;
  });
}

// Сохранить сообщение
export async function saveMessage(chatId: string, message: Message) {
  const messageId = `msg:${chatId}:${message.id}`;
  await kv.set(messageId, message);
  await kv.sadd(`messages:chat:${chatId}`, messageId);
  
  // Обновляем lastMessage в чате
  const chat = await kv.get(`chat:${chatId}`);
  if (chat) {
    const chatData = chat as Chat;
    chatData.lastMessage = message;
    await kv.set(`chat:${chatId}`, chatData);
  }
}

// Получить сообщения чата
export async function getChatMessages(chatId: string): Promise<Message[]> {
  const messageIds = await kv.smembers(`messages:chat:${chatId}`);
  const messages = [];
  for (const id of messageIds) {
    if (typeof id === 'string') {
      const msg = await kv.get(id);
      if (msg) messages.push(msg as Message);
    }
  }
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

// ==================== ДРУЗЬЯ ====================

// Отправить заявку
export async function sendFriendRequest(request: FriendRequest) {
  await kv.set(`friend:request:${request.id}`, request);
  await kv.sadd(`friend:requests:to:${request.toUserId}`, request.id);
}

// Получить входящие заявки
export async function getIncomingRequests(userId: string): Promise<FriendRequest[]> {
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
  return requests;
}

// Принять заявку
export async function acceptFriendRequest(requestId: string): Promise<FriendRequest | null> {
  const request = await kv.get(`friend:request:${requestId}`);
  if (!request) return null;
  
  const requestData = request as FriendRequest;
  requestData.status = 'accepted';
  await kv.set(`friend:request:${requestId}`, requestData);
  
  // Добавляем в друзья обоим
  await kv.sadd(`friends:user:${requestData.fromUserId}`, requestData.toUserId);
  await kv.sadd(`friends:user:${requestData.toUserId}`, requestData.fromUserId);
  
  return requestData;
}

// Отклонить заявку
export async function rejectFriendRequest(requestId: string): Promise<FriendRequest | null> {
  const request = await kv.get(`friend:request:${requestId}`);
  if (!request) return null;
  
  const requestData = request as FriendRequest;
  requestData.status = 'rejected';
  await kv.set(`friend:request:${requestId}`, requestData);
  
  return requestData;
}

// Получить друзей пользователя
export async function getUserFriends(userId: string): Promise<Partial<User>[]> {
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
  return friends;
}

// Удалить из друзей
export async function removeFriend(userId: string, friendId: string) {
  await kv.srem(`friends:user:${userId}`, friendId);
  await kv.srem(`friends:user:${friendId}`, userId);
}

// ==================== ОНЛАЙН-СТАТУС ====================

// Обновить активность
export async function updateLastActive(userId: string) {
  await kv.set(`lastactive:${userId}`, Date.now());
}

// Получить последнюю активность
export async function getLastActive(userId: string): Promise<number | null> {
  return await kv.get(`lastactive:${userId}`);
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