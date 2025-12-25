import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Body,
  BadRequestException,
  Request,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { AccountService } from './account.service';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post('create')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'displayImage', maxCount: 1 },
      { name: 'detailImages', maxCount: 8 },
    ]),
  )
  async createAccount(
    @Request() req: any,
    @UploadedFiles()
    files: {
      displayImage?: Express.Multer.File[];
      detailImages?: Express.Multer.File[];
    },
    @Body() body: any, // Use any to skip validation, we'll validate manually
  ) {
    // Validate display image
    if (!files?.displayImage || files.displayImage.length === 0) {
      throw new BadRequestException('Display image is required');
    }

    // Validate required fields
    if (!body.game || typeof body.game !== 'string') {
      throw new BadRequestException('game is required and must be a string');
    }
    if (!body.type || typeof body.type !== 'string') {
      throw new BadRequestException('type is required and must be a string');
    }

    // Parse categories from JSON string if it comes as string
    let categories = body.categories;
    if (typeof body.categories === 'string') {
      try {
        categories = JSON.parse(body.categories);
      } catch {
        throw new BadRequestException('Invalid categories format');
      }
    }

    // Validate categories
    if (!Array.isArray(categories) || categories.length === 0) {
      throw new BadRequestException(
        'categories must be an array with at least 1 element',
      );
    }

    // Create account
    const result = await this.accountService.createAccount(
      {
        game: body.game,
        server: body.server,
        type: body.type,
        categories,
        displayImage: files.displayImage[0],
        detailImages: files.detailImages || [],
      },
      req.user.uid,
    );

    return result;
  }

  @Get('owner/all')
  @UseGuards(FirebaseAuthGuard)
  async getOwnerAccounts(@Request() req: any) {
    const userId = req.user.uid;
    const accounts = await this.accountService.getAccountsByOwner(userId);
    return accounts;
  }

  @Get('game/:game')
  async getAccountsByGame(@Param('game') game: string) {
    const accounts = await this.accountService.getAccountsByGame(game);
    return accounts;
  }

  @Get(':id')
  async getAccountById(@Param('id') id: string) {
    const account = await this.accountService.getAccountById(id);
    if (!account) {
      throw new BadRequestException('Account not found');
    }
    return account;
  }

  @Post('list/update')
  @UseGuards(FirebaseAuthGuard)
  async updateListName(
    @Request() req: any,
    @Body() body: { listId: string; type: string },
  ) {
    const result = await this.accountService.updateListType(
      body.listId,
      body.type,
      req.user.uid,
    );
    return result;
  }

  @Post('category/update')
  @UseGuards(FirebaseAuthGuard)
  async updateCategory(
    @Request() req: any,
    @Body()
    body: {
      listId: string;
      categoryId: string;
      name: string;
      price: number;
    },
  ) {
    const result = await this.accountService.updateCategory(
      body.listId,
      body.categoryId,
      body.name,
      body.price,
      req.user.uid,
    );
    return result;
  }

  @Post('account/update')
  @UseGuards(FirebaseAuthGuard)
  async updateAccount(
    @Request() req: any,
    @Body()
    body: {
      listId: string;
      categoryId: string;
      accountId: string;
      username: string;
      password: string;
      status: 'available' | 'sold';
    },
  ) {
    const result = await this.accountService.updateAccountCredentials(
      body.listId,
      body.categoryId,
      body.accountId,
      body.username,
      body.password,
      body.status,
      req.user.uid,
    );
    return result;
  }

  @Post('account/add')
  @UseGuards(FirebaseAuthGuard)
  async addAccountToCategory(
    @Request() req: any,
    @Body()
    body: {
      listId: string;
      categoryId: string;
      username: string;
      password: string;
    },
  ) {
    const result = await this.accountService.addAccountToCategory(
      body.listId,
      body.categoryId,
      body.username,
      body.password,
      req.user.uid,
    );
    return result;
  }

  @Post('account/delete')
  @UseGuards(FirebaseAuthGuard)
  async deleteAccount(
    @Request() req: any,
    @Body()
    body: {
      listId: string;
      categoryId: string;
      accountId: string;
    },
  ) {
    const result = await this.accountService.deleteAccount(
      body.listId,
      body.categoryId,
      body.accountId,
      req.user.uid,
    );
    return result;
  }

  @Get('owner/dashboard/stats')
  @UseGuards(FirebaseAuthGuard)
  async getDashboardStats(@Request() req: any) {
    const stats = await this.accountService.getDashboardStats(req.user.uid);
    return stats;
  }

  @Delete('list/:listId')
  @UseGuards(FirebaseAuthGuard)
  async deleteList(@Request() req: any, @Param('listId') listId: string) {
    const result = await this.accountService.deleteList(listId, req.user.uid);
    return result;
  }

  @Post('list/:listId/images')
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'displayImage', maxCount: 1 },
      { name: 'detailImages', maxCount: 8 },
    ]),
  )
  async updateListImages(
    @Request() req: any,
    @Param('listId') listId: string,
    @UploadedFiles()
    files: {
      displayImage?: Express.Multer.File[];
      detailImages?: Express.Multer.File[];
    },
    @Body() body: any,
  ) {
    const imagesToDelete = body.imagesToDelete
      ? JSON.parse(body.imagesToDelete)
      : [];

    const result = await this.accountService.updateListImages(
      listId,
      req.user.uid,
      files.displayImage?.[0],
      files.detailImages || [],
      imagesToDelete,
    );
    return result;
  }
}
