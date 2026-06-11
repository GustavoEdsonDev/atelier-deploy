export type Product = {
  id: number
  name: string
  price: number
  oldPrice?: number
  description: string
  label: string
  image: string
  accent: string
  package: {
    width: number
    height: number
    length: number
    weight: number
  }
}

export const products: Product[] = [
  {
    id: 1,
    name: 'Caneca de Bolinhas',
    price: 129,
    oldPrice: 154,
    description: 'Peça autoral com alças e bolinhas aplicadas, ideal para destacar a coleção na vitrine.',
    label: 'Oferta da semana',
    image: '/assets/products/caneca-bolinha.jpeg',
    accent: 'rgba(205, 187, 34, 0.28)',
    package: { width: 13, height: 11, length: 13, weight: 0.45 },
  },
  {
    id: 2,
    name: 'Caneca',
    price: 120,
    description: 'Caneca com interior esmaltado e presença artesanal para o uso diário.',
    label: 'Clássico do atelier',
    image: '/assets/products/caneca.jpeg',
    accent: 'rgba(240, 106, 0, 0.12)',
    package: { width: 12, height: 10, length: 12, weight: 0.4 },
  },
  {
    id: 3,
    name: 'Prato Risoto',
    price: 136,
    description: 'Prato de servir com borda ampla, pensado para refeições especiais e composição de mesa.',
    label: 'Mesa posta',
    image: '/assets/products/prato-risoto.jpeg',
    accent: 'rgba(143, 230, 92, 0.2)',
    package: { width: 28, height: 6, length: 28, weight: 0.9 },
  },
  {
    id: 4,
    name: 'Boleira P',
    price: 162,
    description: 'Boleira em cerâmica para servir com destaque, trazendo volume e presença à bancada.',
    label: 'Para servir',
    image: '/assets/products/boleira-p.jpeg',
    accent: 'rgba(216, 211, 199, 0.72)',
    package: { width: 24, height: 12, length: 24, weight: 1.2 },
  },
]
