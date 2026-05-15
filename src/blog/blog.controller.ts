import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
  async getAllBlogs(@Query('limit') limit?: string): Promise<{ data: Blog[] }> {
    let parsedLimit: number | undefined;

    if (limit !== undefined) {
      parsedLimit = Number.parseInt(limit, 10);

      if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
        throw new BadRequestException('limit must be a positive integer');
      }
    }

    const blogs = await this.blogService.getAllBlogs(parsedLimit);
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
