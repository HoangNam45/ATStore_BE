# Blog API Documentation

## Overview

Blog API module cung cap endpoint tao bai viet, lay danh sach bai viet, va upload anh.

## API Endpoints

### 1. Create Blog Post

**POST** `/api/blogs`

Create a new blog post.

#### Request Body

```json
{
  "title": "Ten bai viet",
  "contentHtml": "<p>Noi dung HTML tu editor</p>",
  "coverImageUrl": "https://.../cover.jpg"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "data": {
    "data": {
      "id": "blog_id_from_firestore",
      "slug": "ten-bai-viet",
      "title": "Ten bai viet",
      "contentHtml": "<p>Noi dung HTML</p>",
      "excerpt": "Noi dung...",
      "coverImageUrl": "https://.../cover.jpg",
      "createdAt": "2024-05-14T10:30:00Z",
      "updatedAt": "2024-05-14T10:30:00Z",
      "published": true,
      "readTime": "2 min read"
    }
  },
  "timestamp": "2024-05-14T10:30:00Z",
  "path": "/api/blogs"
}
```

#### Error Response (400/500)

```json
{
  "message": "title is required"
}
```

---

### 2. Get All Blogs (Published)

**GET** `/api/blogs`

Fetch all published blogs ordered by createdAt (newest first).

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "blog_id_1",
        "slug": "bai-viet-1",
        "title": "Bai viet 1",
        "contentHtml": "<p>Noi dung</p>",
        "excerpt": "Noi dung...",
        "coverImageUrl": null,
        "createdAt": "2024-05-14T10:30:00Z",
        "updatedAt": "2024-05-14T10:30:00Z",
        "published": true,
        "readTime": "1 min read"
      }
    ]
  },
  "timestamp": "2024-05-14T10:30:00Z",
  "path": "/api/blogs"
}
```

---

### 3. Get Blog By Slug

**GET** `/api/blogs/:slug`

Fetch a single published blog by slug.

#### Parameters

- `slug` (string): Blog slug (e.g., "ten-bai-viet")

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "data": {
      "id": "blog_id_1",
      "slug": "bai-viet-1",
      "title": "Bai viet 1",
      "contentHtml": "<p>Noi dung</p>",
      "excerpt": "Noi dung...",
      "coverImageUrl": null,
      "createdAt": "2024-05-14T10:30:00Z",
      "updatedAt": "2024-05-14T10:30:00Z",
      "published": true,
      "readTime": "1 min read"
    }
  },
  "timestamp": "2024-05-14T10:30:00Z",
  "path": "/api/blogs/ten-bai-viet"
}
```

#### Error Response (400/404)

```json
{
  "message": "Blog not found"
}
```

---

### 4. Upload Image

**POST** `/api/uploads`

Upload an image to Firebase Storage for use in blog posts.

#### Request

```
Content-Type: multipart/form-data
file: [image file]
```

Supported formats: image/\*

Max file size: 10MB

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "url": "https://storage.googleapis.com/<bucket>/blog-uploads/1715693400000-abc123.jpg"
  },
  "timestamp": "2024-05-14T10:30:00Z",
  "path": "/api/uploads"
}
```

#### Error Response (400/500)

```json
{
  "message": "Only image files are allowed."
}
```

---

## Firestore Collection Structure

```
blogs/
├── {blogId}
│   ├── title: string
│   ├── contentHtml: string (HTML)
│   ├── slug: string (auto-generated from title)
│   ├── createdAt: timestamp
│   ├── updatedAt: timestamp
│   ├── excerpt: string
│   ├── readTime: string
│   ├── coverImageUrl: string | null
│   └── published: boolean (default: true)
```

---

## Features

### Auto-generated Slug

- Slug is automatically generated from the title when creating a blog
- ASCII slug only

### Image Upload

- Images are uploaded to Firebase Storage in `blog-uploads/` folder
- File size is limited to 10MB
- Only image formats are allowed

### Timestamps

- `createdAt`: Creation timestamp (server timestamp)
- `updatedAt`: Last update timestamp (server timestamp)

---

## Error Handling

All errors follow the standard error response format:

```json
{
  "message": "Error message describing what went wrong"
}
```

Common HTTP status codes:

- `201 Created`: Blog successfully created
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request data or validation error
- `500 Internal Server Error`: Server error

---

## Example Usage

### 1. Create a blog post

```bash
curl -X POST http://localhost:3000/api/blogs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Huong dan NestJS",
    "contentHtml": "<p>Noi dung bai viet ve NestJS</p>",
    "coverImageUrl": null
  }'
```

### 2. Get all blogs

```bash
curl -X GET http://localhost:3000/api/blogs
```

### 3. Get a specific blog by slug

```bash
curl -X GET http://localhost:3000/api/blogs/ten-bai-viet
```

### 4. Upload an image

```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Content-Type: multipart/form-data" \
  -F "file=@image.jpg"
```

---

## Installation & Running

### Prerequisites

- Node.js 18+
- Firebase project with Storage and Firestore enabled
- Environment variables configured

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run start:dev

# Run in production mode
npm run start:prod
```

The API will be available at `http://localhost:3000`
