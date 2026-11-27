export const shopPath = '/demo/shop';
export const cartPath = shopPath + '/cart';

export const departments = {
  lighting: 'Свет',
  organization: 'Организация',
  textiles: 'Текстиль',
} as const;

export const products = [
  {
    id: 'desk-lamp',
    name: 'Настольная лампа «Луч»',
    department: 'lighting',
    price: 189,
    finish: 'Терракотовый',
    description: 'Лаконичная лампа с направленным светом для чтения и работы.',
    details: [['Материал', 'Металл с матовым покрытием'], ['Тип установки', 'Настольная'], ['Цвет', 'Терракотовый']],
    alt: 'Терракотовая настольная лампа на светлом деревянном столе',
  },
  {
    id: 'oak-stand',
    name: 'Дубовая подставка «Уровень»',
    department: 'organization',
    price: 119,
    finish: 'Натуральный дуб',
    description: 'Поднимает ноутбук и оставляет свободное место под ним.',
    details: [['Материал', 'Дуб'], ['Поверхность', 'Скруглённые кромки'], ['Цвет', 'Натуральный дуб']],
    alt: 'Дубовая подставка со скруглёнными углами на песочном фоне',
  },
  {
    id: 'felt-mat',
    name: 'Войлочный коврик «Тихий»',
    department: 'textiles',
    price: 59,
    finish: 'Серо-оливковый',
    description: 'Мягкая поверхность для клавиатуры, мыши и записной книжки.',
    details: [['Материал', 'Войлок'], ['Края', 'Прошитые'], ['Цвет', 'Серо-оливковый']],
    alt: 'Серо-оливковый коврик с прошитым краем на деревянном столе',
  },
] as const;

export type Product = typeof products[number];
export type ProductId = Product['id'];
export const productPath = (id: ProductId) => shopPath + '/' + id;
export const priceLabel = (price: number) => new Intl.NumberFormat('ru').format(price) + ' BYN';

export function searchText(value: string) {
  return value.toLocaleLowerCase('ru').normalize('NFC').replaceAll('ё', 'е').trim();
}
