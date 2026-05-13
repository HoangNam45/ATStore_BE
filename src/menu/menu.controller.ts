import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { Menu } from './entities/menu.entity';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * Create a new menu item with image upload
   * POST /menu
   */
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async createMenu(
    @Body() createMenuDto: CreateMenuDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ success: boolean; data: Menu; message: string }> {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh món ăn.');
    }

    const menu = await this.menuService.createMenu(createMenuDto, file);
    return {
      success: true,
      data: menu,
      message: 'Đã tạo món ăn thành công!',
    };
  }

  /**
   * Get all menu items
   * GET /menu
   */
  @Get()
  async getAllMenus(): Promise<{ success: boolean; data: Menu[] }> {
    const menus = await this.menuService.getAllMenus();
    return {
      success: true,
      data: menus,
    };
  }

  /**
   * Get menu items by category
   * GET /menu/category/:category
   */
  @Get('category/:category')
  async getMenusByCategory(
    @Param('category') category: string,
  ): Promise<{ success: boolean; data: Menu[] }> {
    const menus = await this.menuService.getMenusByCategory(category);
    return {
      success: true,
      data: menus,
    };
  }

  /**
   * Get a single menu item
   * GET /menu/:id
   */
  @Get(':id')
  async getMenu(
    @Param('id') id: string,
  ): Promise<{ success: boolean; data: Menu | null }> {
    const menu = await this.menuService.getMenuById(id);
    return {
      success: menu !== null,
      data: menu,
    };
  }

  /**
   * Update a menu item
   * PUT /menu/:id
   */
  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async updateMenu(
    @Param('id') id: string,
    @Body() updateMenuDto: Partial<CreateMenuDto>,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<{ success: boolean; data: Menu; message: string }> {
    const menu = await this.menuService.updateMenu(id, updateMenuDto, file);
    return {
      success: true,
      data: menu,
      message: 'Đã cập nhật món ăn thành công!',
    };
  }

  /**
   * Delete a menu item
   * DELETE /menu/:id
   */
  @Delete(':id')
  async deleteMenu(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.menuService.deleteMenu(id);
    return {
      success: true,
      message: 'Đã xóa món ăn thành công!',
    };
  }
}
