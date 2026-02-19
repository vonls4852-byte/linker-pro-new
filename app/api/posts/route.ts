import { NextResponse } from 'next/server';
import { savePost, getFeed, likePost, addComment, getUserPosts } from '../../lib/kv';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const feed = searchParams.get('feed');

    if (feed && userId) {
      const posts = await getFeed(userId);
      return NextResponse.json({ posts });
    }

    if (userId) {
      const posts = await getUserPosts(userId);
      return NextResponse.json({ posts });
    }

    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'create') {
      const { userId, userName, userNickname, userAvatar, content, image } = data;
      
      const newPost = {
        id: Date.now().toString(),
        userId,
        userName,
        userNickname,
        userAvatar,
        content,
        image: image || null,
        likes: [],
        comments: [],
        createdAt: Date.now()
      };

      await savePost(newPost);
      return NextResponse.json({ success: true, post: newPost });
    }

    if (action === 'like') {
      const { postId, userId } = data;
      const updatedPost = await likePost(postId, userId);
      return NextResponse.json({ success: true, post: updatedPost });
    }

    if (action === 'comment') {
      const { postId, comment } = data;
      const updatedPost = await addComment(postId, comment);
      return NextResponse.json({ success: true, post: updatedPost });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}