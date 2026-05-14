export interface Blog {
  id: string;
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  published: boolean;
  readTime: string;
}
