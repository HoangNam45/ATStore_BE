import { BadRequestException, Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import sanitizeHtml from 'sanitize-html';
import { FirebaseService } from '../firebase/firebase.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { Blog } from './entities/blog.entity';

@Injectable()
export class BlogService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async createBlog(createBlogDto: CreateBlogDto): Promise<Blog> {
    const sanitizedHtml = this.sanitizeContent(createBlogDto.contentHtml);
    if (!sanitizedHtml.trim()) {
      throw new BadRequestException('contentHtml is required');
    }

    const title = createBlogDto.title.trim();
    if (!title) {
      throw new BadRequestException('title is required');
    }

    const baseSlug = this.slugify(title);
    if (!baseSlug) {
      throw new BadRequestException('title is invalid');
    }

    const firestore = this.firebaseService.getFirestore();
    const blogsCollection = firestore.collection('blogs');

    let slug = baseSlug;
    const existing = await blogsCollection
      .where('slug', '==', slug)
      .limit(1)
      .get();
    if (!existing.empty) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const textContent = this.stripHtml(sanitizedHtml);
    const excerpt = this.buildExcerpt(textContent);
    const readTime = this.buildReadTime(textContent);

    const docRef = blogsCollection.doc();
    const blogData: any = {
      id: docRef.id,
      slug,
      title,
      contentHtml: sanitizedHtml,
      excerpt,
      coverImageUrl: createBlogDto.coverImageUrl ?? null,
      published: true,
      readTime,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(blogData);
    const createdDoc = await docRef.get();
    const data = createdDoc.data();

    return this.mapBlog(data);
  }

  async getAllBlogs(limit?: number): Promise<Blog[]> {
    const firestore = this.firebaseService.getFirestore();
    let query = firestore
      .collection('blogs')
      .where('published', '==', true)
      .orderBy('createdAt', 'desc');

    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    const blogs: Blog[] = [];
    snapshot.forEach((doc) => {
      blogs.push(this.mapBlog(doc.data()));
    });

    return blogs;
  }

  async getBlogBySlug(slug: string): Promise<Blog | null> {
    const firestore = this.firebaseService.getFirestore();
    const snapshot = await firestore
      .collection('blogs')
      .where('slug', '==', slug)
      .where('published', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return this.mapBlog(doc.data());
  }

  private sanitizeContent(contentHtml: string): string {
    return sanitizeHtml(contentHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'figure',
        'figcaption',
      ]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        img: ['src', 'alt', 'title', 'width', 'height'],
        a: ['href', 'name', 'target', 'rel'],
      },
      allowedSchemes: ['http', 'https', 'data'],
      allowedSchemesByTag: {
        img: ['http', 'https', 'data'],
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
      },
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private buildExcerpt(text: string): string {
    if (!text) {
      return '';
    }

    const maxLength = 160;
    if (text.length <= maxLength) {
      return text;
    }

    return `${text.slice(0, maxLength).trim()}...`;
  }

  private buildReadTime(text: string): string {
    if (!text) {
      return '1 min read';
    }

    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min read`;
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapBlog(data?: admin.firestore.DocumentData): Blog {
    if (!data) {
      return {
        id: '',
        slug: '',
        title: '',
        contentHtml: '',
        excerpt: '',
        coverImageUrl: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        published: false,
        readTime: '1 min read',
      };
    }

    const createdAt = data.createdAt?.toDate?.() ?? new Date();
    const updatedAt = data.updatedAt?.toDate?.() ?? new Date();

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      contentHtml: data.contentHtml,
      excerpt: data.excerpt,
      coverImageUrl: data.coverImageUrl ?? null,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      published: Boolean(data.published),
      readTime: data.readTime ?? '1 min read',
    };
  }
}
