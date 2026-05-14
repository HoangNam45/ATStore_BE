import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { SkipResponseWrap } from '../common/decorators/skip-response-wrap.decorator';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { Blog } from './entities/blog.entity';

@Controller('api/blogs')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Post()
  @SkipResponseWrap()
  async createBlog(
    @Body() createBlogDto: CreateBlogDto,
  ): Promise<{ data: Blog }> {
    const blog = await this.blogService.createBlog(createBlogDto);
    return { data: blog };
  }

  @Get()
  @SkipResponseWrap()
  async getAllBlogs(): Promise<{ data: Blog[] }> {
    const blogs = await this.blogService.getAllBlogs();
    return { data: blogs };
  }

  @Get(':slug')
  @SkipResponseWrap()
  async getBlogBySlug(@Param('slug') slug: string): Promise<{ data: Blog }> {
    const blog = await this.blogService.getBlogBySlug(slug);
    if (!blog) {
      throw new BadRequestException('Blog not found');
    }
    return { data: blog };
  }
}
