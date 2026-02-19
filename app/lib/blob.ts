import { put, del, list } from '@vercel/blob';

// Загрузка файла
export async function uploadFile(
  file: File | Blob,
  path: string,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const extension = file instanceof File ? file.name.split('.').pop() : 'bin';
  const filename = `${path}-${userId}-${timestamp}.${extension}`;
  
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: true
  });
  
  return blob.url;
}

// Загрузка аватара
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  return uploadFile(file, 'avatar', userId);
}

// Загрузка изображения поста
export async function uploadPostImage(file: File, postId: string): Promise<string> {
  const timestamp = Date.now();
  const extension = file.name.split('.').pop();
  const filename = `post-${postId}-${timestamp}.${extension}`;
  
  const blob = await put(filename, file, {
    access: 'public',
    addRandomSuffix: true
  });
  
  return blob.url;
}

// Загрузка файла в чат
export async function uploadChatFile(file: File, chatId: string, userId: string): Promise<string> {
  return uploadFile(file, `chat-${chatId}`, userId);
}

// Загрузка голосового сообщения
export async function uploadVoiceMessage(blob: Blob, chatId: string, userId: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `voice-${chatId}-${userId}-${timestamp}.webm`;
  
  const result = await put(filename, blob, {
    access: 'public',
    addRandomSuffix: true
  });
  
  return result.url;
}

// Удаление файла
export async function deleteFile(url: string) {
  await del(url);
}

// Получение списка файлов
export async function listFiles(prefix?: string) {
  const { blobs } = await list({ prefix });
  return blobs;
}