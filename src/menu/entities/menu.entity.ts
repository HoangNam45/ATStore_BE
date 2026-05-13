export class Menu {
  id: string;
  name: string;
  price: number;
  category: 'coffee' | 'milk-tea' | 'matcha' | 'tea' | 'coldbrew' | 'special';
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}
