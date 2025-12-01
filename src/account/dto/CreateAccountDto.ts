export interface CreateAccountDto {
  game: string;
  server?: string;
  type: string;
  displayImage: Express.Multer.File;
  detailImages: Express.Multer.File[];
  categories: {
    name: string;
    price: number;
    accounts: {
      username: string;
      password: string;
    }[];
  }[];
}
