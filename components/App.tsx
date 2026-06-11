'use client'

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Download,
  Home,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  Minus,
  PenLine,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Store,
  Trash2,
  UserRound,
  Users
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { products, type Product } from '@/data/products'
import { digitsOnly, formatCep, isValidCep, lookupCepAddress } from '@/lib/cep'
import { quoteShipping, type ShippingOption } from '@/lib/shipping'

type Screen =
  | 'home'
  | 'products'
  | 'product-detail'
  | 'cart'
  | 'customer'
  | 'address'
  | 'payment'
  | 'success'
  | 'admin-hub'
  | 'admin-sales'
  | 'admin-users'
  | 'admin-stock'
  | 'admin-monthly'

type AdminView = 'hub' | 'sales' | 'users' | 'user-detail' | 'stock' | 'monthly'
type PaymentMethod = 'pix' | 'card'

type CartItem = { id: number; quantity: number }
type CartLine = Product & { quantity: number; subtotal: number }

type CustomerForm = { name: string; email: string; cpf: string; phone: string }
type AddressForm = { cep: string; street: string; number: string; neighborhood: string; city: string; complement: string }
type SaleRecord = { code: string; customer: string; date: string; createdAt: string; quantity: number; total: number; paymentMethod: string }
type UserRecord = { id: string; name: string; email: string; cpf: string; phone: string; city: string; date: string; orders: number }
type UserPurchaseMock = { code: string; date: string; channel: string; paymentMethod: string; shippingMethod: string; total: number }
type StockItem = { id: number; name: string; stock: number; image: string }
type CompletedOrder = {
  code: string
  customerName: string
  date: string
  subtotal: number
  discount: number
  shipping: number
  shippingService: string
  total: number
  itemCount: number
  paymentMethod: string
}

const initialCart: CartItem[] = []

const initialCustomer: CustomerForm = { name: '', email: '', cpf: '', phone: '' }
const initialAddress: AddressForm = { cep: '', street: '', number: '', neighborhood: '', city: '', complement: '' }

const now = new Date()
const seedMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() - offset, 12, 10, 0, 0).toISOString()

const initialSales: SaleRecord[] = [
  { code: 'AR-1820', customer: 'Epaminondas', date: '12/01/26', createdAt: seedMonth(5), quantity: 1, total: 198, paymentMethod: 'PIX' },
  { code: 'AR-2488', customer: 'Cleide da Silva', date: '17/03/26', createdAt: seedMonth(3), quantity: 2, total: 204, paymentMethod: 'Cartao' },
  { code: 'AR-3094', customer: 'Mariana Alves', date: '21/05/26', createdAt: seedMonth(1), quantity: 1, total: 102, paymentMethod: 'PIX' },
]

const initialUsers: UserRecord[] = [
  { id: '11122233344', name: 'Epaminondas', email: 'epa@atelier-raizes.demo', cpf: '111.222.333-44', phone: '(11) 98888-1111', city: 'Sao Paulo', date: '12/01/26', orders: 3 },
  { id: '22233344455', name: 'Cleide da Silva', email: 'cleide@atelier-raizes.demo', cpf: '222.333.444-55', phone: '(11) 97777-2222', city: 'Campinas', date: '17/03/26', orders: 2 },
  { id: '33344455566', name: 'Mariana Alves', email: 'mariana@atelier-raizes.demo', cpf: '333.444.555-66', phone: '(21) 96666-3333', city: 'Niteroi', date: '21/05/26', orders: 1 },
]

const initialInventory: StockItem[] = [
  { id: 1, name: 'Caneca de Bolinhas', stock: 8, image: '/assets/products/caneca-bolinha.jpeg' },
  { id: 2, name: 'Caneca', stock: 11, image: '/assets/products/caneca.jpeg' },
  { id: 3, name: 'Prato Risoto', stock: 6, image: '/assets/products/prato-risoto.jpeg' },
  { id: 4, name: 'Boleira P', stock: 4, image: '/assets/products/boleira-p.jpeg' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (value: Date) => new Intl.DateTimeFormat('pt-BR').format(value)
const parseDateFromShort = (value: string) => {
  const [day, month, year] = value.split('/').map((part) => Number(part))
  if (!day || !month || !year) return new Date()
  return new Date(2000 + year, month - 1, day)
}
const paymentLabel = (method: PaymentMethod) => (method === 'card' ? 'Cartao' : 'PIX')
const formatQuantity = (value: number) => `x${String(value).padStart(2, '0')}`

const csvDownload = (fileName: string, rows: Array<Record<string, string>>) => {
  const headers = Object.keys(rows[0] ?? {})
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

const fallbackImage = (label: string, accent = '#D4C844') =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" rx="32" fill="#E8E2D3"/><circle cx="200" cy="150" r="62" fill="${accent}" fill-opacity="0.42"/><path d="M126 254c26-28 66-44 74-44s48 16 74 44" fill="none" stroke="#E65A28" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><text x="200" y="330" font-family="Arial, sans-serif" font-size="26" text-anchor="middle" fill="#E65A28">${label}</text></svg>`,
  )}`

const whatsappSupportNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5511999999999'

const buildWhatsAppLink = (message: string) => {
  const url = new URL('https://api.whatsapp.com/send')
  url.searchParams.set('phone', digitsOnly(whatsappSupportNumber))
  url.searchParams.set('text', message)
  return url.toString()
}

const formatPersonalizationMessage = (product: Product, customizationText: string) => {
  const personalizationLines = customizationText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return [
    'Olá, Atelier Raízes! Gostaria de solicitar um produto personalizado.',
    '',
    `Produto: ${product.name}`,
    `Código: AR-${String(product.id).padStart(3, '0')}`,
    '',
    'Personalização solicitada:',
    ...(personalizationLines.length > 0 ? personalizationLines.map((line) => `- ${line}`) : ['- Personalização não informada']),
    '',
    'Poderia, por favor, confirmar prazo, valor final e orientações de produção?',
  ].join('\n')
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [adminView, setAdminView] = useState<AdminView>('hub')
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? 1)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [customizationText, setCustomizationText] = useState('')
  const [isCustomizationOpen, setIsCustomizationOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>(initialCart)
  const [customer, setCustomer] = useState<CustomerForm>(initialCustomer)
  const [address, setAddress] = useState<AddressForm>(initialAddress)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' })
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null)
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>(initialSales)
  const [userRecords, setUserRecords] = useState<UserRecord[]>(initialUsers)
  const [stock, setStock] = useState<Record<number, number>>(Object.fromEntries(initialInventory.map((item) => [item.id, item.stock])))
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState('')
  const [cepLookupLoading, setCepLookupLoading] = useState(false)
  const [cepLookupError, setCepLookupError] = useState('')
  const [cepLookupSuccess, setCepLookupSuccess] = useState('')

  const cartLines = useMemo<CartLine[]>(
    () =>
      cart.flatMap((entry) => {
        const product = products.find((item) => item.id === entry.id)
        if (!product) return []
        return [{ ...product, quantity: entry.quantity, subtotal: product.price * entry.quantity }]
      }),
    [cart],
  )

  const inventoryItems = useMemo(
    () => initialInventory.map((item) => ({ ...item, stock: stock[item.id] ?? item.stock })),
    [stock],
  )
  const featuredProduct = products[featuredIndex] ?? products[0]
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0]
  const availableProductsCount = products.filter((product) => (stock[product.id] ?? 0) > 0).length
  const catalogCategories = useMemo(() => {
    const counts = products.reduce<Record<string, number>>((groups, product) => {
      const name = product.name.toLowerCase()
      const category =
        name.includes('caneca') ? 'Canecas' :
        name.includes('prato') ? 'Mesa posta' :
        name.includes('boleira') ? 'Servir' :
        'Autorais'

      return {
        ...groups,
        [category]: (groups[category] ?? 0) + 1,
      }
    }, {})

    return Object.entries(counts).map(([label, total]) => ({ label, total }))
  }, [])
  const startingPrice = Math.min(...products.map((product) => product.price))
  const cepReady = isValidCep(address.cep)
  const subtotal = cartLines.reduce((sum, item) => sum + item.subtotal, 0)
  const discount = subtotal * 0.05
  const selectedShippingOption =
    shippingOptions.find((option) => option.id === selectedShippingId) ??
    shippingOptions[0] ??
    null
  const shipping = selectedShippingOption?.price ?? null
  const total = subtotal - discount + (shipping ?? 0)
  const totalItems = cartLines.reduce((sum, item) => sum + item.quantity, 0)
  const cartHasUnavailableItems = cartLines.some((item) => item.quantity > (stock[item.id] ?? 0))

  const customerComplete =
    customer.name.trim().length >= 3 &&
    customer.email.includes('@') &&
    digitsOnly(customer.cpf).length >= 11 &&
    digitsOnly(customer.phone).length >= 10

  const addressComplete =
    cepReady &&
    address.street.trim().length >= 3 &&
    address.number.trim().length >= 1 &&
    address.neighborhood.trim().length >= 2 &&
    address.city.trim().length >= 2

  const cardComplete =
    paymentMethod !== 'card' ||
    (card.name.trim().length >= 3 && digitsOnly(card.number).length >= 14 && card.expiry.trim().length >= 4 && digitsOnly(card.cvv).length >= 3)

  const checkoutReady =
    cartLines.length > 0 &&
    customerComplete &&
    addressComplete &&
    cardComplete &&
    !cartHasUnavailableItems &&
    !shippingLoading &&
    shipping !== null
  const monthlyData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(monthDate).replace('.', '')
      const totalValue = salesHistory
        .filter((sale) => {
          const saleDate = new Date(sale.createdAt)
          return saleDate.getFullYear() === monthDate.getFullYear() && saleDate.getMonth() === monthDate.getMonth()
        })
        .reduce((sum, sale) => sum + sale.total, 0)

      return {
        label: label.charAt(0).toUpperCase() + label.slice(1, 3),
        total: totalValue,
      }
    })

    return months
  }, [salesHistory])

  const selectedAdminUser = useMemo(
    () => userRecords.find((user) => user.id === selectedAdminUserId) ?? null,
    [selectedAdminUserId, userRecords],
  )

  const selectedAdminUserPurchases = useMemo<UserPurchaseMock[]>(() => {
    if (!selectedAdminUser) return []

    const shippingMock = ['Correios PAC', 'Correios SEDEX', 'Jadlog .Package']
    const channelMock = ['Site Atelier', 'WhatsApp', 'Instagram']
    const totalOrders = Math.max(1, selectedAdminUser.orders)
    const relatedSales = salesHistory.filter(
      (sale) => sale.customer.trim().toLowerCase() === selectedAdminUser.name.trim().toLowerCase(),
    )
    const seed = Number(digitsOnly(selectedAdminUser.id).slice(-4) || 0)

    return Array.from({ length: totalOrders }, (_, index) => {
      const sale = relatedSales[index]

      if (sale) {
        return {
          code: sale.code,
          date: sale.date,
          channel: channelMock[(seed + index) % channelMock.length],
          paymentMethod: sale.paymentMethod,
          shippingMethod: shippingMock[(seed + index) % shippingMock.length],
          total: sale.total,
        }
      }

      const date = parseDateFromShort(selectedAdminUser.date)
      date.setDate(date.getDate() - (index + 1) * 13)

      return {
        code: `AR-${String((seed + index * 97) % 10000).padStart(4, '0')}`,
        date: formatDate(date),
        channel: channelMock[(seed + index) % channelMock.length],
        paymentMethod: ['PIX', 'Cartao'][(seed + index) % 2],
        shippingMethod: shippingMock[(seed + index) % shippingMock.length],
        total: 110 + ((seed + index * 37) % 230),
      }
    })
  }, [selectedAdminUser, salesHistory])

  useEffect(() => {
    setCart((current) =>
      current.flatMap((item) => {
        const available = stock[item.id] ?? 0
        const quantity = Math.min(item.quantity, available)
        return quantity > 0 ? [{ ...item, quantity }] : []
      }),
    )
  }, [stock])

  useEffect(() => {
    if (screen !== 'home' || products.length < 2) return

    const intervalId = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % products.length)
    }, 4500)

    return () => window.clearInterval(intervalId)
  }, [screen])

  useEffect(() => {
    if (!cepReady) {
      setCepLookupLoading(false)
      setCepLookupError('')
      setCepLookupSuccess('')
      return
    }

    let active = true
    const controller = new AbortController()

    setCepLookupLoading(true)
    setCepLookupError('')
    setCepLookupSuccess('')

    lookupCepAddress(address.cep, controller.signal)
      .then((resolvedAddress) => {
        if (!active) return

        setAddress((current) => ({
          ...current,
          street: resolvedAddress.street,
          neighborhood: resolvedAddress.neighborhood,
          city: resolvedAddress.city,
        }))
        setCepLookupSuccess('Endereço carregado automaticamente pelo CEP.')
      })
      .catch((error) => {
        if (!active || controller.signal.aborted) return

        setCepLookupError(error instanceof Error ? error.message : 'Falha ao consultar o CEP.')
        setCepLookupSuccess('')
      })
      .finally(() => {
        if (active) setCepLookupLoading(false)
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [address.cep, cepReady])

  useEffect(() => {
    if (!cepReady || cartLines.length === 0) {
      setShippingLoading(false)
      setShippingError('')
      setShippingOptions([])
      setSelectedShippingId(null)
      return
    }

    let active = true

    setShippingLoading(true)
    setShippingError('')

    quoteShipping(
      digitsOnly(address.cep),
      cartLines.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        package: item.package,
      })),
    )
      .then((options) => {
        if (!active) return

        setShippingOptions(options)
        setSelectedShippingId((current) => {
          if (current && options.some((option) => option.id === current)) return current
          return options[0]?.id ?? null
        })
        setShippingError(options.length === 0 ? 'Nenhuma opcao de frete disponivel para este CEP.' : '')
      })
      .catch((error) => {
        if (!active) return

        setShippingOptions([])
        setSelectedShippingId(null)
        setShippingError(error instanceof Error ? error.message : 'Nao foi possivel calcular o frete.')
      })
      .finally(() => {
        if (active) setShippingLoading(false)
      })

    return () => {
      active = false
    }
  }, [address.cep, cartLines, cepReady])

  const goToFeatured = (index: number) => {
    const total = products.length
    setFeaturedIndex(((index % total) + total) % total)
  }

  const goToPreviousFeatured = () => {
    setFeaturedIndex((current) => (current - 1 + products.length) % products.length)
  }

  const goToNextFeatured = () => {
    setFeaturedIndex((current) => (current + 1) % products.length)
  }

  const openProductDetails = (productId: number) => {
    setSelectedProductId(productId)
    setCustomizationText('')
    setIsCustomizationOpen(false)
    setScreen('product-detail')
  }

  const handleCarouselDragEnd = (endX: number) => {
    if (dragStartX === null) return

    const delta = endX - dragStartX
    const swipeThreshold = 42

    if (delta <= -swipeThreshold) goToNextFeatured()
    if (delta >= swipeThreshold) goToPreviousFeatured()

    setDragStartX(null)
  }

  const addToCart = (productId: number) => {
    const available = stock[productId] ?? 0
    if (available <= 0) return

    setCart((current) => {
      const existing = current.find((item) => item.id === productId)
      if (existing) {
        if (existing.quantity >= available) return current
        return current.map((item) => (item.id === productId ? { ...item, quantity: item.quantity + 1 } : item))
      }

      return [...current, { id: productId, quantity: 1 }]
    })
  }

  const changeQuantity = (productId: number, delta: number) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== productId) return item
          const available = stock[item.id] ?? 0
          const nextQuantity = Math.min(available, item.quantity + delta)
          return { ...item, quantity: nextQuantity }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  const placeOrder = () => {
    if (!checkoutReady || shipping === null) return

    const date = new Date()
    const orderCode = `AR-${Math.floor(1000 + Math.random() * 9000)}`
    const orderSummary: CompletedOrder = {
      code: orderCode,
      customerName: customer.name.trim(),
      date: formatDate(date),
      subtotal,
      discount,
      shipping,
      shippingService: selectedShippingOption ? `${selectedShippingOption.company} - ${selectedShippingOption.name}` : 'Melhor Envio',
      total,
      itemCount: totalItems,
      paymentMethod: paymentLabel(paymentMethod),
    }

    setCompletedOrder(orderSummary)
    setSalesHistory((current) => [
      {
        code: orderCode,
        customer: customer.name.trim(),
        date: orderSummary.date,
        createdAt: date.toISOString(),
        quantity: totalItems,
        total,
        paymentMethod: paymentLabel(paymentMethod),
      },
      ...current,
    ])
    setUserRecords((current) => {
      const userId = digitsOnly(customer.cpf) || customer.email.trim().toLowerCase()
      const existing = current.find((item) => item.id === userId)

      if (existing) {
        return current.map((item) =>
          item.id === userId
            ? {
                ...item,
                name: customer.name.trim(),
                email: customer.email.trim(),
                cpf: customer.cpf.trim(),
                phone: customer.phone.trim(),
                city: address.city.trim(),
                date: orderSummary.date,
                orders: item.orders + 1,
              }
            : item,
        )
      }

      return [
        {
          id: userId,
          name: customer.name.trim(),
          email: customer.email.trim(),
          cpf: customer.cpf.trim(),
          phone: customer.phone.trim(),
          city: address.city.trim(),
          date: orderSummary.date,
          orders: 1,
        },
        ...current,
      ]
    })
    setStock((current) =>
      cartLines.reduce(
        (updatedStock, item) => ({
          ...updatedStock,
          [item.id]: Math.max(0, (updatedStock[item.id] ?? 0) - item.quantity),
        }),
        current,
      ),
    )
    setCart(initialCart)
    setCustomer(initialCustomer)
    setAddress(initialAddress)
    setPaymentMethod('pix')
    setCard({ number: '', name: '', expiry: '', cvv: '' })
    setShippingOptions([])
    setSelectedShippingId(null)
    setShippingError('')
    setScreen('success')
  }

  const fillDemoCustomer = () => {
    setCustomer({
      name: 'Ana Luiza Exemplo',
      email: 'cliente@email.com',
      cpf: '123.456.789-10',
      phone: '(11) 98888-0000',
    })
    setAddress({
      cep: '30140-071',
      street: 'Avenida Paulista',
      number: '900',
      neighborhood: 'Bela Vista',
      city: 'Sao Paulo',
      complement: 'Conjunto 12',
    })
  }

  const resetDemo = () => {
    setScreen('home')
    setAdminView('hub')
    setIsLoggedIn(false)
    setIsMenuOpen(false)
    setCart(initialCart)
    setCustomer(initialCustomer)
    setAddress(initialAddress)
    setPaymentMethod('pix')
    setCard({ number: '', name: '', expiry: '', cvv: '' })
    setSelectedAdminUserId(null)
    setSalesHistory(initialSales)
    setUserRecords(initialUsers)
    setStock(Object.fromEntries(initialInventory.map((item) => [item.id, item.stock])))
    setCompletedOrder(null)
    setShippingOptions([])
    setSelectedShippingId(null)
    setShippingLoading(false)
    setShippingError('')
  }

  const navItems: Array<{ key: Screen; label: string; icon: typeof Home }> = [
    { key: 'home', label: 'Início', icon: Home },
    { key: 'products', label: 'Produtos', icon: Store },
    { key: 'cart', label: 'Carrinho', icon: ShoppingCart },
    { key: 'admin-hub', label: 'Admin', icon: ShieldCheck },
  ]

  const openAdminPanel = () => {
    setIsLoggedIn(true)
    setScreen('admin-hub')
    setAdminView('hub')
    setIsMenuOpen(false)
  }

  const toggleLoginState = () => {
    const nextLoggedIn = !isLoggedIn
    setIsLoggedIn(nextLoggedIn)
    setIsMenuOpen(false)

    if (!nextLoggedIn && screen.startsWith('admin')) {
      setScreen('home')
      setAdminView('hub')
    }
  }

  const imageFor = (product: Product) => (
    <img
      src={product.image}
      alt={product.name}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.onerror = null
        event.currentTarget.src = fallbackImage(product.name)
      }}
    />
  )

  const brandLogo = (sizeClassName = 'h-16 w-16') => (
    <div className={`brand-mark ${sizeClassName}`}>
      <img src="/assets/brand/logo.png" alt="Logo Atelier Raízes" />
    </div>
  )

  const topBar = (title: string, subtitle: string, showBack = false, backAction = () => setScreen('home')) => (
    <header className="app-topbar">
      <div className="app-topbar-row">
        {showBack ? (
          <button type="button" onClick={backAction} className="app-topbar-back">
            <ArrowLeft size={18} />
          </button>
        ) : null}

        {brandLogo(showBack ? 'h-10 w-10' : 'h-11 w-11')}

        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-none text-atelier-ink">Atelier Raízes</p>
          <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-atelier-muted">MVP demonstrativo</p>
        </div>
      </div>

      <div className="mt-4">
        <h1 className="text-[1.6rem] font-semibold leading-tight tracking-[-0.05em] text-atelier-burnt md:text-[2rem]">{title}</h1>
        {subtitle ? <p className="mt-1.5 max-w-xl text-sm leading-6 text-atelier-muted">{subtitle}</p> : null}
      </div>
    </header>
  )

  const home = () => {
    const availableStock = stock[featuredProduct.id] ?? 0
    const soldOut = availableStock <= 0

    return (
      <div className="screen-stack">
        <section className="desktop-hero-grid">
          <div className="space-y-5 md:space-y-6">
            <div className="home-header">
              <div className="flex items-center gap-3 md:gap-4">
                {brandLogo('h-[3.5rem] w-[3.5rem] md:h-[4.6rem] md:w-[4.6rem]')}
                <p className="text-[1.55rem] font-semibold leading-none tracking-[-0.05em] text-atelier-ink md:text-[2rem]">Atelier Raízes</p>
              </div>
            </div>

            <div className="space-y-3 md:space-y-4">
              <p className="section-kicker hidden md:block md:text-sm">Coleção autoral para mesa e casa</p>
              <h1 className="hero-title home-hero-title md:mx-0 md:max-w-[12ch] md:text-left">
                Cerâmica artesanal para colorir sua rotina
              </h1>
              <p className="hero-copy hidden md:block md:mx-0 md:max-w-[56ch] md:text-left">
                Peças autorais com presença acolhedora, acabamento cuidadoso e uma curadoria pensada para mesa e casa.
              </p>
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-3">
              <div className="surface-muted">
                <p className="section-kicker">Catálogo</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-atelier-burnt">{products.length} peças</p>
                <p className="mt-1 text-sm text-atelier-muted">Seleção enxuta e curada para a demo.</p>
              </div>
              <div className="surface-muted">
                <p className="section-kicker">Disponíveis</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-atelier-burnt">{availableProductsCount} em estoque</p>
                <p className="mt-1 text-sm text-atelier-muted">Seleção disponível para pronta entrega.</p>
              </div>
              <div className="surface-muted">
                <p className="section-kicker">Faixa de preço</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-atelier-burnt">A partir de {formatCurrency(startingPrice)}</p>
                <p className="mt-1 text-sm text-atelier-muted">Preço já visível antes de entrar no catálogo.</p>
              </div>
            </div>

            <div className="hidden flex-col gap-3 md:flex md:flex-row">
              <button type="button" onClick={() => setScreen('products')} className="cta-primary px-6">
                Explorar catálogo
              </button>
              <button type="button" onClick={() => setScreen('cart')} className="cta-secondary">
                Abrir carrinho
              </button>
            </div>
          </div>

          <section
            className="feature-card px-4 pb-4 pt-3 md:pb-6 md:pt-5"
            onTouchStart={(event) => setDragStartX(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => handleCarouselDragEnd(event.changedTouches[0]?.clientX ?? 0)}
            onMouseDown={(event) => setDragStartX(event.clientX)}
            onMouseUp={(event) => handleCarouselDragEnd(event.clientX)}
            onMouseLeave={() => setDragStartX(null)}
          >
            <div className="feature-media feature-carousel-stage px-5 py-2.5 md:px-5 md:py-4">
              <button
                type="button"
                onClick={goToPreviousFeatured}
                aria-label="Produto anterior"
                className="carousel-arrow left-1 md:left-3"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={goToNextFeatured}
                aria-label="Próximo produto"
                className="carousel-arrow right-1 md:right-3"
              >
                <ArrowRight size={18} />
              </button>
              <div className="feature-carousel-image aspect-square overflow-hidden rounded-[1.15rem] bg-white/75 md:aspect-[1/1.02]">{imageFor(featuredProduct)}</div>
            </div>

            <div className="mt-4 md:mt-6">
              <div className="flex items-center justify-between gap-3">
                <p className="rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-atelier-burnt">
                  {featuredProduct.label}
                </p>
                <p className="text-sm font-medium text-atelier-ink/65">{featuredIndex + 1}/{products.length}</p>
              </div>
              <p className="mt-3 text-[1.9rem] font-semibold leading-none tracking-[-0.06em] text-atelier-burnt md:mt-4 md:text-[2.35rem]">
                {featuredProduct.name}
              </p>
              <p className="mt-2 text-sm text-atelier-ink/70">
                {soldOut ? 'Indisponível no momento' : `${availableStock} unidade(s) prontas para envio`}
              </p>
            </div>

            <div className="mt-4 flex flex-col items-start gap-4 md:mt-5">
              <div className="min-w-0">
                {featuredProduct.oldPrice ? (
                  <p className="text-lg font-semibold text-atelier-ink/45 line-through">{formatCurrency(featuredProduct.oldPrice)}</p>
                ) : null}
                <p className="price-hero">{formatCurrency(featuredProduct.price)}</p>
                <p className="mt-3 max-w-[32ch] text-sm leading-6 text-atelier-ink/70">{featuredProduct.description}</p>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(featuredProduct.id)
                    setScreen('cart')
                  }}
                  disabled={soldOut}
                  className="cta-primary w-full shrink-0 px-6 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soldOut ? 'Indisponível' : 'Ver produto'}
                </button>
                <button type="button" onClick={() => setScreen('products')} className="cta-secondary w-full sm:w-auto">
                  Ver catálogo
                </button>
              </div>
            </div>
          </section>
        </section>

        <div className="flex justify-center gap-3">
          {products.map((product, index) => (
            <button
              key={product.id}
              type="button"
              aria-label={`Ver destaque ${index + 1}`}
              onClick={() => goToFeatured(index)}
              className={`pagination-dot ${featuredIndex === index ? 'pagination-dot-active' : ''}`}
            />
          ))}
        </div>

        <section className="surface-panel">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="section-kicker">Coleção em destaque</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-atelier-ink md:text-[1.8rem]">Outras peças da vitrine</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-atelier-muted md:text-base">
                Explore diferentes formatos, acabamentos e propostas da coleção em destaque.
              </p>
            </div>
            <button type="button" onClick={() => setScreen('products')} className="cta-secondary">
              Ver catálogo completo
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.filter((product) => product.id !== featuredProduct.id).map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => goToFeatured(products.findIndex((item) => item.id === product.id))}
                className="surface-muted h-full text-left"
              >
                <div className="aspect-[1/0.9] overflow-hidden rounded-[1rem] bg-white/70">{imageFor(product)}</div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-atelier-muted">{product.label}</p>
                <p className="mt-1 text-lg font-semibold tracking-[-0.03em] text-atelier-ink">{product.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  {product.oldPrice ? (
                    <span className="text-sm text-atelier-ink/45 line-through">{formatCurrency(product.oldPrice)}</span>
                  ) : null}
                  <span className="text-base font-semibold text-atelier-burnt">{formatCurrency(product.price)}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="surface-panel">
          <p className="section-kicker">Sobre mim</p>
          <div className="mt-4 grid gap-4 md:grid-cols-[auto,1fr] md:items-center">
            <div className="flex justify-center md:justify-start">
              {brandLogo('h-24 w-24')}
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.04em] text-atelier-ink">Cerâmica feita com calma, afeto e identidade</h2>
              <p className="mt-3 text-sm leading-6 text-atelier-muted md:text-base">
                No Atelier Raízes, cada peça nasce de um processo artesanal que valoriza o tempo, a matéria e os pequenos rituais do dia a dia.
              </p>
              <p className="mt-3 text-sm leading-6 text-atelier-muted md:text-base">
                A proposta é criar objetos autorais para mesa e casa com presença acolhedora, acabamento cuidadoso e um toque de cor para acompanhar a rotina.
              </p>
            </div>
          </div>
        </section>
      </div>
    )
  }

  const productsScreen = () => (
    <div className="catalog-screen">
      <div className="catalog-header-fixed">
        {topBar('Produtos', 'Catálogo objetivo, pensado para leitura rápida e compra direta.')}
      </div>

      <div className="catalog-content">
        <section className="surface-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Catálogo completo</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.04em] text-atelier-ink md:text-[1.8rem]">Peças autorais da coleção</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-atelier-muted md:text-base">
              Uma seleção enxuta para apresentar formas, cores e usos do atelier com clareza.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 lg:max-w-[28rem] lg:justify-end">
            {catalogCategories.map((category) => (
              <span
                key={category.label}
                className="inline-flex items-center gap-2 rounded-full bg-white/75 px-4 py-2 text-sm font-semibold text-atelier-ink shadow-soft"
              >
                <span>{category.label}</span>
                <span className="rounded-full bg-atelier-mustard px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-atelier-burnt">
                  {category.total}
                </span>
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-full bg-atelier-burnt px-4 py-2 text-sm font-semibold text-white shadow-soft">
              <span>Disponíveis</span>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs uppercase tracking-[0.12em] text-white">
                {availableProductsCount}
              </span>
            </span>
          </div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <article key={product.id} className="flex h-full flex-col rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft">
            <div className="overflow-hidden rounded-[1.4rem] p-2" style={{ backgroundColor: product.accent }}>
              <div className="aspect-[4/3] overflow-hidden rounded-[1rem] bg-white/80">{imageFor(product)}</div>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-atelier-burnt">{product.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <p className="rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
                {(stock[product.id] ?? 0) > 0 ? `${stock[product.id] ?? 0} em estoque` : 'Sem estoque'}
              </p>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">{product.label}</p>
            </div>
            <p className="mt-3 flex-1 text-sm leading-6 text-stone-900">{product.description}</p>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div>
                {product.oldPrice ? <p className="text-sm text-stone-500 line-through">{formatCurrency(product.oldPrice)}</p> : null}
                <p className="text-xl font-semibold text-stone-900">{formatCurrency(product.price)}</p>
              </div>
              <button
                type="button"
                onClick={() => openProductDetails(product.id)}
                className="rounded-full bg-atelier-lime px-4 py-3 text-sm font-semibold text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Detalhes
              </button>
            </div>
          </article>
        ))}
        </section>
      </div>
    </div>
  )

  const productDetailScreen = () => {
    const product = selectedProduct ?? products[0]
    const availableStock = stock[product.id] ?? 0
    const soldOut = availableStock <= 0
    const customizationReady = customizationText.trim().length >= 3
    const whatsappMessage = formatPersonalizationMessage(product, customizationText)
    const whatsappLink = buildWhatsAppLink(whatsappMessage)

    return (
      <div className="space-y-4">
        {topBar(product.name, 'Veja os detalhes da peça e escolha entre compra direta ou personalização.', true, () => setScreen('products'))}

        <section className="surface-panel">
          <div className="grid gap-5 lg:grid-cols-[1.05fr,0.95fr] lg:items-start">
            <div>
              <div className="overflow-hidden rounded-[1.8rem] bg-white/70 p-3" style={{ backgroundColor: product.accent }}>
                <div className="aspect-[4/3] overflow-hidden rounded-[1.3rem] bg-white/85">
                  {imageFor(product)}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-atelier-burnt">
                  {product.label}
                </span>
                <span className="inline-flex items-center rounded-full bg-atelier-burnt px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                  {soldOut ? 'Sem estoque' : `${availableStock} em estoque`}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-atelier-muted">Detalhe do produto</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-atelier-ink">{product.name}</h2>
                <div className="mt-3 flex items-baseline gap-3">
                  {product.oldPrice ? <span className="text-lg text-atelier-ink/45 line-through">{formatCurrency(product.oldPrice)}</span> : null}
                  <span className="text-3xl font-semibold text-atelier-burnt">{formatCurrency(product.price)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-atelier-muted">{product.description}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.3rem] bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-atelier-muted">Medidas</p>
                  <p className="mt-2 text-sm font-semibold text-atelier-ink">
                    {product.package.width} x {product.package.height} x {product.package.length} cm
                  </p>
                </div>
                <div className="rounded-[1.3rem] bg-white/75 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-atelier-muted">Peso estimado</p>
                  <p className="mt-2 text-sm font-semibold text-atelier-ink">
                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(product.package.weight)} kg
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(product.id)
                    setScreen('cart')
                  }}
                  disabled={soldOut}
                  className="cta-primary w-full px-6 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {soldOut ? 'Indisponível' : 'Comprar'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomizationOpen((current) => !current)}
                  className="cta-secondary w-full px-6"
                >
                  Personalizados
                </button>
              </div>

              {isCustomizationOpen ? (
                <div className="rounded-[1.6rem] bg-atelier-mustard p-4 shadow-soft">
                  <div className="rounded-[1.3rem] bg-white/80 p-4">
                    <div className="flex items-start gap-3">
                      <MessageCircle className="mt-0.5 text-atelier-burnt" size={20} />
                      <div>
                        <p className="text-sm font-semibold text-atelier-burnt">Personalização do pedido</p>
                        <p className="mt-1 text-sm leading-6 text-stone-700">
                          Descreva nome, cor, frase, acabamento ou qualquer ajuste que o administrador precise entender.
                        </p>
                      </div>
                    </div>

                    <textarea
                      value={customizationText}
                      onChange={(event) => setCustomizationText(event.target.value)}
                      placeholder={'Ex.:\n- Nome para gravação\n- Cor predominante\n- Frase ou tema\n- Observações adicionais'}
                      className="mt-4 min-h-36 w-full rounded-[1.25rem] border-0 bg-white px-4 py-3 text-sm leading-6 outline-none"
                    />

                    <a
                      href={customizationReady ? whatsappLink : '#'}
                      onClick={(event) => {
                        if (!customizationReady) event.preventDefault()
                      }}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!customizationReady}
                      className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${customizationReady ? 'bg-atelier-burnt text-white' : 'cursor-not-allowed bg-stone-200 text-stone-500'}`}
                    >
                      Abrir WhatsApp do gestor
                      <MessageCircle size={16} />
                    </a>
                    <p className="mt-3 text-xs leading-5 text-stone-600">
                      O link já leva uma mensagem estruturada com o produto escolhido e a descrição da personalização.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    )
  }

  const cartScreen = () => (
    <div className="space-y-4">
      {topBar('Carrinho', 'Quantidade, desconto e frete em uma única tela.')}

      <div className="checkout-desktop-grid">
        <section className="rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft md:p-5">
          <div className="flex items-center gap-2 text-stone-900">
            <BadgeCheck size={18} />
            <p className="text-sm font-semibold">5% de desconto na primeira compra</p>
          </div>

          {cartHasUnavailableItems ? (
            <div className="mt-4 rounded-[1.25rem] bg-white/80 p-4 text-sm font-semibold text-atelier-burnt">
              Ajuste o carrinho para seguir: um ou mais itens passaram do estoque disponivel.
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {cartLines.length === 0 ? <div className="rounded-[1.25rem] bg-white/70 p-4 text-sm text-stone-700">Carrinho vazio.</div> : null}
            {cartLines.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] bg-white/75 p-3 md:p-4">
                <div className="flex gap-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white md:h-24 md:w-24">{imageFor(item)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-atelier-burnt md:text-base">{item.name}</p>
                        <p className="mt-1 text-xs text-stone-700">Disponivel: {stock[item.id] ?? 0} unidade(s)</p>
                      </div>
                      <button type="button" onClick={() => changeQuantity(item.id, -item.quantity)} className="text-stone-900">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm">
                        <button type="button" onClick={() => changeQuantity(item.id, -1)}><Minus size={16} /></button>
                        <span className="min-w-6 text-center font-semibold">{item.quantity}</span>
                        <button type="button" onClick={() => changeQuantity(item.id, 1)}><Plus size={16} /></button>
                      </div>
                      <p className="text-sm font-semibold text-stone-900 md:text-base">{formatCurrency(item.subtotal)}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="checkout-summary-card rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft md:p-5">
          <div className="space-y-2 text-stone-900">
            <div className="flex items-center justify-between"><p className="font-semibold">Produtos ({cartLines.length})</p><p className="font-semibold">{formatCurrency(subtotal)}</p></div>
            <div className="flex items-center justify-between"><p className="font-semibold">Frete</p><p className="text-right font-semibold">{shippingLoading ? 'Consultando...' : shippingError ? 'Revise o CEP' : shipping === null ? 'Calcule com o CEP' : formatCurrency(shipping)}</p></div>
            <div className="flex items-center justify-between"><p className="font-semibold">Desconto</p><p className="font-semibold">- {formatCurrency(discount)}</p></div>
            <div className="flex items-center justify-between border-t border-black/10 pt-3 text-lg"><p className="font-semibold">Total</p><p className="text-right font-semibold">{shipping === null ? `${formatCurrency(subtotal - discount)} + frete` : formatCurrency(total)}</p></div>
          </div>

          <div className="mt-5 rounded-[1.4rem] bg-white/75 p-4">
            <p className="section-kicker">Resumo rápido</p>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Confira os valores do pedido antes de seguir para as próximas etapas da compra.
            </p>
            {selectedShippingOption ? (
              <p className="mt-3 text-sm font-semibold text-atelier-burnt">
                {selectedShippingOption.company} • {selectedShippingOption.name}
              </p>
            ) : null}
            {shippingError ? <p className="mt-3 text-sm font-semibold text-atelier-burnt">{shippingError}</p> : null}
          </div>

          <button type="button" onClick={() => setScreen('customer')} disabled={cartLines.length === 0 || cartHasUnavailableItems} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-atelier-lime px-4 py-3 font-semibold text-stone-900 disabled:opacity-60">
            Continuar
            <ArrowRight size={16} />
          </button>
        </section>
      </div>
    </div>
  )

  const customerScreen = () => (
    <div className="space-y-4">
      {topBar('Dados pessoais', 'Preencha apenas o necessário para seguir para a entrega.', true, () => setScreen('cart'))}

      <div className="checkout-desktop-grid">
        <section className="rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft md:p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={customer.name} onChange={(event) => setCustomer((current) => ({ ...current, name: event.target.value }))} placeholder="Nome" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={customer.email} onChange={(event) => setCustomer((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={customer.cpf} onChange={(event) => setCustomer((current) => ({ ...current, cpf: event.target.value }))} placeholder="CPF" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={customer.phone} onChange={(event) => setCustomer((current) => ({ ...current, phone: event.target.value }))} placeholder="Telefone" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
          </div>

          <div className="mt-6 rounded-[1.4rem] bg-white/75 p-4 text-center md:text-left">
            <p className="text-sm font-semibold text-atelier-burnt">Já é nosso cliente?</p>
            <p className="mt-2 text-sm text-stone-700">Preencha automaticamente os campos para testar a jornada completa da compra.</p>
            <button type="button" onClick={fillDemoCustomer} className="mt-3 rounded-full bg-white px-4 py-3 font-semibold text-atelier-burnt shadow-sm">Usar dados demo</button>
          </div>

          <button type="button" onClick={() => setScreen('address')} disabled={!customerComplete} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-atelier-lime px-4 py-3 font-semibold text-stone-900 disabled:opacity-60">
            Continuar
            <ArrowRight size={16} />
          </button>
        </section>

        <aside className="checkout-summary-card surface-panel">
          <p className="section-kicker">Etapa 1 de 3</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-atelier-ink">Identificação do cliente</h2>
          <p className="mt-3 text-sm leading-6 text-atelier-muted">
            Revise os principais dados do pedido enquanto avança pelo preenchimento.
          </p>
          <div className="mt-5 rounded-[1.4rem] bg-white/70 p-4">
            <div className="flex items-center justify-between text-sm"><span>Itens</span><span className="font-semibold">{totalItems}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{formatCurrency(subtotal)}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm"><span>Desconto</span><span className="font-semibold">- {formatCurrency(discount)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  )

  const addressScreen = () => (
    <div className="space-y-4">
      {topBar('Endereço', 'Endereço da entrega para o pedido.', true, () => setScreen('customer'))}

      <div className="checkout-desktop-grid">
        <section className="rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft md:p-5">
          <div className="rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Endereço de entrega:</p>
            <p className="mt-2 text-sm text-stone-800">{address.street || 'Rua, número e complemento'} {address.number ? `- ${address.number}` : ''}</p>
            <p className="text-sm text-stone-800">{address.neighborhood || 'Bairro'} - {address.city || 'Cidade'}</p>
            <button type="button" onClick={() => setScreen('customer')} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-atelier-burnt shadow-sm">
              Mudar dados
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={address.cep}
              onChange={(event) => {
                const formattedCep = formatCep(event.target.value)
                setAddress((current) => ({ ...current, cep: formattedCep }))
              }}
              placeholder="CEP"
              inputMode="numeric"
              className="rounded-full border-0 bg-white px-4 py-3 outline-none"
            />
            <input value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} placeholder="Cidade" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={address.street} onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))} placeholder="Rua" className="rounded-full border-0 bg-white px-4 py-3 outline-none md:col-span-2" />
            <input value={address.number} onChange={(event) => setAddress((current) => ({ ...current, number: event.target.value }))} placeholder="Número" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={address.neighborhood} onChange={(event) => setAddress((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Bairro" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
            <input value={address.complement} onChange={(event) => setAddress((current) => ({ ...current, complement: event.target.value }))} placeholder="Complemento" className="rounded-full border-0 bg-white px-4 py-3 outline-none md:col-span-2" />
          </div>

          {/* <div className="mt-4 rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Validação de CEP</p>
            {!address.cep ? <p className="mt-2 text-sm text-stone-700">Informe o CEP para preencher o endereço automaticamente.</p> : null}
            {address.cep && !cepReady ? <p className="mt-2 text-sm text-stone-700">CEP inválido. Digite os 8 dígitos no formato 00000-000.</p> : null}
            {cepLookupLoading ? <p className="mt-2 text-sm text-stone-700">Buscando endereço pelo CEP...</p> : null}
            {!cepLookupLoading && cepLookupError ? <p className="mt-2 text-sm font-semibold text-atelier-burnt">{cepLookupError}</p> : null}
            {!cepLookupLoading && !cepLookupError && cepLookupSuccess ? <p className="mt-2 text-sm font-semibold text-stone-900">{cepLookupSuccess}</p> : null}
          </div> */}

          <div className="mt-4 rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Opções de frete</p>
            {!cepReady ? <p className="mt-2 text-sm text-stone-700">Preencha um CEP válido para consultar o Melhor Envio.</p> : null}
            {cepReady && shippingLoading ? <p className="mt-2 text-sm text-stone-700">Consultando transportadoras em tempo real...</p> : null}
            {cepReady && !shippingLoading && shippingError ? <p className="mt-2 text-sm font-semibold text-atelier-burnt">{shippingError}</p> : null}
            {cepReady && !shippingLoading && !shippingError && shippingOptions.length > 0 ? (
              <div className="mt-3 space-y-2">
                {shippingOptions.map((option) => {
                  const checked = option.id === selectedShippingOption?.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedShippingId(option.id)}
                      className={`flex w-full items-center justify-between rounded-[1.1rem] border px-4 py-3 text-left ${checked ? 'border-atelier-burnt bg-atelier-mustard/25' : 'border-black/10 bg-white'}`}
                    >
                      <span>
                        <span className="block text-sm font-semibold text-stone-900">{option.company} • {option.name}</span>
                        <span className="mt-1 block text-xs text-stone-600">
                          {option.deliveryDays === null ? 'Prazo sob consulta' : `${option.deliveryDays} dia(s) úteis`}
                        </span>
                      </span>
                      <span className="text-sm font-semibold text-stone-900">{formatCurrency(option.price)}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>

          <button type="button" onClick={() => setScreen('payment')} disabled={!addressComplete || shippingLoading || shipping === null} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-atelier-lime px-4 py-3 font-semibold text-stone-900 disabled:opacity-60">
            Continuar
            <ArrowRight size={16} />
          </button>
        </section>

        <aside className="checkout-summary-card surface-panel">
          <p className="section-kicker">Etapa 2 de 3</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-atelier-ink">Entrega e frete</h2>
          <p className="mt-3 text-sm leading-6 text-atelier-muted">
            Confira o endereço informado e a estimativa de frete antes de seguir para o pagamento.
          </p>
          <div className="mt-5 rounded-[1.4rem] bg-white/70 p-4">
            <div className="flex items-center justify-between text-sm"><span>CEP</span><span className="font-semibold">{address.cep || 'Nao informado'}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm"><span>Frete</span><span className="font-semibold">{shippingLoading ? 'Consultando...' : shipping === null ? 'Aguardando cotação' : formatCurrency(shipping)}</span></div>
            {selectedShippingOption ? <div className="mt-2 text-sm font-semibold text-atelier-burnt">{selectedShippingOption.company} • {selectedShippingOption.name}</div> : null}
            {shippingError ? <div className="mt-2 text-sm font-semibold text-atelier-burnt">{shippingError}</div> : null}
            <div className="mt-2 flex items-center justify-between text-sm"><span>Total parcial</span><span className="font-semibold">{formatCurrency(subtotal - discount)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  )

  const paymentScreen = () => (
    <div className="space-y-4">
      {topBar('Pagamento', 'Escolha a forma de pagamento e conclua o pedido.', true, () => setScreen('address'))}

      <div className="checkout-desktop-grid">
        <section className="rounded-[2rem] border border-white/80 bg-atelier-mustard p-4 shadow-soft md:p-5">
          <div className="rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Endereço de entrega:</p>
            <p className="mt-2 text-sm text-stone-800">{address.street || 'Rua, número e complemento'} {address.number ? `- ${address.number}` : ''}</p>
            <p className="text-sm text-stone-800">{address.neighborhood || 'Bairro'} - {address.city || 'Cidade'}</p>
            <button type="button" onClick={() => setScreen('address')} className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-atelier-burnt shadow-sm">
              Mudar endereço
            </button>
          </div>

          <div className="mt-4 rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Método de pagamento</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <button type="button" onClick={() => setPaymentMethod('pix')} className={`rounded-2xl px-3 py-3 font-semibold ${paymentMethod === 'pix' ? 'bg-atelier-lime text-stone-900' : 'bg-white text-stone-700'}`}>PIX</button>
              <button type="button" onClick={() => setPaymentMethod('card')} className={`rounded-2xl px-3 py-3 font-semibold ${paymentMethod === 'card' ? 'bg-atelier-lime text-stone-900' : 'bg-white text-stone-700'}`}>Cartão</button>
            </div>

            {paymentMethod === 'card' ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input value={card.number} onChange={(event) => setCard((current) => ({ ...current, number: event.target.value }))} placeholder="Número do cartão" className="rounded-full border-0 bg-white px-4 py-3 outline-none md:col-span-2" />
                <input value={card.name} onChange={(event) => setCard((current) => ({ ...current, name: event.target.value }))} placeholder="Nome no cartão" className="rounded-full border-0 bg-white px-4 py-3 outline-none md:col-span-2" />
                <input value={card.expiry} onChange={(event) => setCard((current) => ({ ...current, expiry: event.target.value }))} placeholder="Validade" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
                <input value={card.cvv} onChange={(event) => setCard((current) => ({ ...current, cvv: event.target.value }))} placeholder="CVV" className="rounded-full border-0 bg-white px-4 py-3 outline-none" />
              </div>
            ) : (
              <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-stone-700">Pagamento via PIX na confirmação.</div>
            )}
          </div>

          <div className="mt-4 rounded-[1.4rem] bg-white/75 p-4">
            <p className="text-sm font-semibold text-atelier-burnt">Frete selecionado</p>
            <p className="mt-2 text-sm text-stone-800">
              {selectedShippingOption ? `${selectedShippingOption.company} • ${selectedShippingOption.name}` : 'Selecione uma opção de frete na etapa anterior.'}
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {shippingLoading ? 'Consultando...' : shipping === null ? 'Aguardando cotação' : formatCurrency(shipping)}
            </p>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('card')
                setCard({ number: '', name: '', expiry: '', cvv: '' })
              }}
              className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-atelier-burnt"
            >
              Novo cartão
            </button>
            <button type="button" onClick={placeOrder} disabled={!checkoutReady} className="flex-1 rounded-full bg-atelier-lime px-4 py-3 text-sm font-semibold text-stone-900 disabled:opacity-60">
              Comprar
            </button>
          </div>
        </section>

        <aside className="checkout-summary-card rounded-[2rem] bg-stone-900 p-4 text-white shadow-soft">
          <p className="section-kicker text-white/60">Etapa 3 de 3</p>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">Resumo final do pedido</h2>
          <div className="mt-5">
            <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="mt-2 flex items-center justify-between text-sm"><span>Frete</span><span>{shippingLoading ? 'Consultando...' : shipping === null ? 'Aguardando cotação' : formatCurrency(shipping)}</span></div>
            {selectedShippingOption ? <div className="mt-2 text-sm text-white/80">{selectedShippingOption.company} • {selectedShippingOption.name}</div> : null}
            <div className="mt-2 flex items-center justify-between text-sm"><span>Desconto</span><span>- {formatCurrency(discount)}</span></div>
            <div className="mt-3 flex items-center justify-between border-t border-white/20 pt-3 text-lg font-semibold"><span>Total</span><span>{formatCurrency(total)}</span></div>
          </div>
          <div className="mt-5 rounded-[1.4rem] bg-white/10 p-4 text-sm text-white/80">
            Revise subtotal, frete e desconto antes de concluir o pedido.
          </div>
        </aside>
      </div>
    </div>
  )

  const successScreen = () => (
    <section className="space-y-4">
      <div className="rounded-[2rem] border border-atelier-lime/50 bg-white p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-atelier-lime/20 p-3 text-atelier-burnt"><BadgeCheck size={24} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-atelier-burnt">Pedido concluído</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">Pedido registrado</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">A compra fictícia atualiza histórico de vendas, cliente e estoque dentro da própria demo.</p>
          </div>
        </div>
        <div className="mt-4 rounded-[1.4rem] bg-stone-100 p-4 text-sm text-stone-700">
          <div className="flex items-center justify-between"><span>Código</span><span className="font-semibold text-stone-900">{completedOrder?.code ?? 'AR-0000'}</span></div>
          <div className="mt-2 flex items-center justify-between"><span>Cliente</span><span className="font-semibold text-stone-900">{completedOrder?.customerName ?? 'Cliente demo'}</span></div>
          <div className="mt-2 flex items-center justify-between"><span>Itens</span><span className="font-semibold text-stone-900">{completedOrder?.itemCount ?? 0}</span></div>
            <div className="mt-2 flex items-center justify-between gap-3"><span>Frete</span><span className="text-right font-semibold text-stone-900">{completedOrder?.shippingService ?? 'Melhor Envio'}</span></div>
          <div className="mt-2 flex items-center justify-between"><span>Pagamento</span><span className="font-semibold text-stone-900">{completedOrder?.paymentMethod ?? 'PIX'}</span></div>
          <div className="mt-2 flex items-center justify-between"><span>Total</span><span className="font-semibold text-atelier-burnt">{formatCurrency(completedOrder?.total ?? 0)}</span></div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={resetDemo} className="flex-1 rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-700">Voltar ao início</button>
          <button type="button" onClick={() => setScreen('products')} className="flex-1 rounded-full bg-atelier-burnt px-4 py-3 text-sm font-semibold text-white">Ver produtos</button>
        </div>
      </div>
    </section>
  )

  const adminHub = () => (
    <section className="space-y-4">
      {topBar('Painel', 'Área administrativa com módulos operacionais da loja.')}
      <div className="grid gap-3 md:grid-cols-2">
        <button type="button" onClick={() => setAdminView('sales')} className="rounded-[2rem] bg-atelier-mustard p-4 text-left shadow-soft"><ReceiptText className="text-atelier-burnt" /><p className="mt-3 text-lg font-semibold text-stone-900">Histórico de Vendas</p><p className="mt-1 text-sm text-stone-800">Pedidos concluídos e CSV.</p></button>
        <button type="button" onClick={() => setAdminView('users')} className="rounded-[2rem] bg-atelier-mustard p-4 text-left shadow-soft"><Users className="text-atelier-burnt" /><p className="mt-3 text-lg font-semibold text-stone-900">Usuários</p><p className="mt-1 text-sm text-stone-800">Clientes e informações.</p></button>
        <button type="button" onClick={() => setAdminView('stock')} className="rounded-[2rem] bg-atelier-mustard p-4 text-left shadow-soft"><Boxes className="text-atelier-burnt" /><p className="mt-3 text-lg font-semibold text-stone-900">Controle de Estoque</p><p className="mt-1 text-sm text-stone-800">Quantidade e ajustes.</p></button>
        <button type="button" onClick={() => setAdminView('monthly')} className="rounded-[2rem] bg-atelier-mustard p-4 text-left shadow-soft"><BarChart3 className="text-atelier-burnt" /><p className="mt-3 text-lg font-semibold text-stone-900">Vendas Mensais</p><p className="mt-1 text-sm text-stone-800">Leitura rápida.</p></button>
      </div>
    </section>
  )

  const adminSalesScreen = () => (
    <section className="space-y-4">
      {topBar('Histórico de Vendas', 'Resumo das últimas vendas.', true, () => setAdminView('hub'))}
      <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
        <div className="space-y-3 rounded-[1.4rem] bg-white p-4">
          {salesHistory.map((sale) => (
            <article key={sale.code} className="rounded-[1.2rem] bg-stone-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-atelier-burnt">{sale.customer}</p>
                  <p className="text-sm text-stone-700">{sale.date} • {sale.code}</p>
                </div>
                <p className="text-sm text-stone-900">{formatQuantity(sale.quantity)}</p>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm font-semibold">
                <span>{sale.paymentMethod}</span>
                <span>{formatCurrency(sale.total)}</span>
              </div>
            </article>
          ))}
        </div>
        <button type="button" onClick={() => csvDownload('historico-vendas.csv', salesHistory.map((sale) => ({ codigo: sale.code, cliente: sale.customer, data: sale.date, quantidade: String(sale.quantity), pagamento: sale.paymentMethod, total: formatCurrency(sale.total) })))} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold text-stone-900">
          Exportar CSV
          <Download size={16} />
        </button>
      </div>
    </section>
  )

  const adminUsersScreen = () => (
    <section className="space-y-4">
      {topBar('Usuários', 'Clique no cliente para abrir a ficha completa.', true, () => setAdminView('hub'))}
      <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
        <div className="space-y-3">
          {userRecords.map((user) => {
            const key = user.id
            return (
              <article key={key} className="rounded-[1.4rem] bg-white p-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAdminUserId(key)
                    setAdminView('user-detail')
                  }}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2"><UserRound size={18} className="text-stone-900" /><p className="text-lg font-semibold text-atelier-burnt">{user.name}</p></div>
                  <div className="flex items-center gap-3 text-sm text-stone-900"><span>{user.date}</span><ArrowRight size={16} /></div>
                </button>
                <div className="mt-3 rounded-2xl bg-stone-100 px-3 py-3 text-sm text-stone-700">
                  <p>Email: {user.email}</p>
                  <p className="mt-1">Cidade: {user.city}</p>
                  <p className="mt-1 font-semibold text-stone-900">Pedidos concluídos: {user.orders}</p>
                </div>
              </article>
            )
          })}
        </div>
        <button type="button" onClick={() => csvDownload('usuarios.csv', userRecords.map((user) => ({ nome: user.name, email: user.email, telefone: user.phone, cidade: user.city, pedidos: String(user.orders), data: user.date })))} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold text-stone-900">
          Exportar CSV
          <Download size={16} />
        </button>
      </div>
    </section>
  )

  const adminUserDetailScreen = () => {
    if (!selectedAdminUser) {
      return (
        <section className="space-y-4">
          {topBar('Usuário não encontrado', 'Selecione novamente um cliente da lista.', true, () => setAdminView('users'))}
          <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
            <button type="button" onClick={() => setAdminView('users')} className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 font-semibold text-stone-900">
              Voltar para usuários
            </button>
          </div>
        </section>
      )
    }

    return (
      <section className="space-y-4">
        {topBar(selectedAdminUser.name, 'Detalhes completos e histórico mockado de compras.', true, () => setAdminView('users'))}
        <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
          <div className="rounded-[1.4rem] bg-white p-4 text-sm text-stone-700">
            <p><span className="font-semibold text-stone-900">Email:</span> {selectedAdminUser.email}</p>
            <p className="mt-1"><span className="font-semibold text-stone-900">Telefone:</span> {selectedAdminUser.phone}</p>
            <p className="mt-1"><span className="font-semibold text-stone-900">CPF:</span> {selectedAdminUser.cpf}</p>
            <p className="mt-1"><span className="font-semibold text-stone-900">Cidade:</span> {selectedAdminUser.city}</p>
            <p className="mt-1"><span className="font-semibold text-stone-900">Primeira compra registrada:</span> {selectedAdminUser.date}</p>
            <p className="mt-1 font-semibold text-stone-900">Total de pedidos concluídos: {selectedAdminUser.orders}</p>
          </div>

          <div className="mt-4 space-y-3">
            {selectedAdminUserPurchases.map((purchase) => (
              <article key={`${purchase.code}-${purchase.date}`} className="rounded-[1.4rem] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-atelier-burnt">{purchase.code}</p>
                    <p className="text-sm text-stone-700">Compra em {purchase.date}</p>
                  </div>
                  <p className="text-sm font-semibold text-stone-900">{formatCurrency(purchase.total)}</p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-stone-700 md:grid-cols-3">
                  <p><span className="font-semibold text-stone-900">Meio:</span> {purchase.channel}</p>
                  <p><span className="font-semibold text-stone-900">Pagamento:</span> {purchase.paymentMethod}</p>
                  <p><span className="font-semibold text-stone-900">Envio:</span> {purchase.shippingMethod}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const adminStockScreen = () => (
    <section className="space-y-4">
      {topBar('Controle de estoque', 'Ajustes rápidos em produtos e quantidades.', true, () => setAdminView('hub'))}
      <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
        <div className="space-y-3">
          {inventoryItems.map((item) => (
            <article key={item.id} className="rounded-[1.4rem] bg-white p-3">
              <div className="flex gap-3">
                <div className="h-20 w-20 overflow-hidden rounded-2xl bg-stone-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null
                      event.currentTarget.src = fallbackImage(item.name)
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-base font-semibold text-atelier-burnt">{item.name}</p>
                    <PenLine size={18} />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setStock((current) => ({ ...current, [item.id]: Math.max(0, (current[item.id] ?? 0) - 1) }))} className="grid h-8 w-8 place-items-center rounded-full bg-atelier-mustard text-stone-900"><Minus size={14} /></button>
                    <span className="min-w-11 rounded-full bg-stone-100 px-3 py-1 text-center text-sm font-semibold">{stock[item.id] ?? item.stock}</span>
                    <button type="button" onClick={() => setStock((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))} className="grid h-8 w-8 place-items-center rounded-full bg-atelier-lime text-stone-900"><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => csvDownload('estoque.csv', inventoryItems.map((item) => ({ produto: item.name, estoque: String(item.stock) })))} className="flex-1 rounded-full bg-white px-4 py-3 text-sm font-semibold text-stone-900">Exportar CSV</button>
          <button type="button" onClick={() => setScreen('products')} className="flex-1 rounded-full bg-atelier-lime px-4 py-3 text-sm font-semibold text-stone-900">Ir para catálogo</button>
        </div>
      </div>
    </section>
  )

  const adminMonthlyScreen = () => (
    <section className="space-y-4">
      {topBar('Vendas Mensais', 'Leitura rápida com gráfico simples e exportação.', true, () => setAdminView('hub'))}
      <div className="rounded-[2rem] bg-atelier-mustard p-4 shadow-soft">
        <div className="flex h-[340px] items-end justify-between gap-3 rounded-[1.5rem] bg-white/75 px-4 pb-4 pt-12">
          {monthlyData.map((entry) => (
            <div key={entry.label} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="w-full rounded-t-2xl bg-atelier-burnt" style={{ height: `${Math.max(24, entry.total * 0.4)}px` }} />
              <span className="text-sm text-stone-900">{entry.label}</span>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => csvDownload('vendas-mensais.csv', monthlyData.map((entry) => ({ mes: entry.label, total: formatCurrency(entry.total) })))} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 font-semibold text-stone-900">
          Exportar CSV
          <Download size={16} />
        </button>
      </div>
    </section>
  )

  const currentScreen = () => {
    if (screen === 'home') return home()
    if (screen === 'products') return productsScreen()
    if (screen === 'product-detail') return productDetailScreen()
    if (screen === 'cart') return cartScreen()
    if (screen === 'customer') return customerScreen()
    if (screen === 'address') return addressScreen()
    if (screen === 'payment') return paymentScreen()
    if (screen === 'success') return successScreen()

    if (adminView === 'hub') return adminHub()
    if (adminView === 'sales') return adminSalesScreen()
    if (adminView === 'users') return adminUsersScreen()
    if (adminView === 'user-detail') return adminUserDetailScreen()
    if (adminView === 'stock') return adminStockScreen()
    if (adminView === 'monthly') return adminMonthlyScreen()

    return home()
  }

  const checkoutBackScreen = () => {
    if (screen === 'payment') {
      setScreen('address')
      return
    }

    if (screen === 'address') {
      setScreen('customer')
      return
    }

    if (screen === 'customer') {
      setScreen('cart')
      return
    }

    setScreen('cart')
  }

  return (
    <main className="app-shell">
      <div className="app-frame">
        <div
          className={`screen-stack app-content ${
            screen === 'customer' || screen === 'address' || screen === 'payment' ? 'app-content-safe' : ''
          }`}
        >
          {currentScreen()}
        </div>

        {screen !== 'success' ? (
          <>
            <nav className="bottom-nav">
              <div className="bottom-nav-grid">
                {navItems.map((item) => {
                  const active = item.key === 'admin-hub' ? screen.startsWith('admin') : screen === item.key
                  const Icon = item.icon

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false)
                        if (item.key === 'admin-hub') {
                          openAdminPanel()
                          return
                        }
                        setScreen(item.key)
                      }}
                      className={`bottom-nav-item ${active ? 'bottom-nav-item-active' : ''}`}
                    >
                      <Icon size={24} />
                      <span>{item.label}</span>
                    </button>
                  )
                })}

                <div className="relative">
                  {isMenuOpen ? (
                    <div className="absolute bottom-full right-0 mb-3 w-[220px] rounded-[1.4rem] border border-white/80 bg-white/95 p-2 shadow-soft backdrop-blur">
                      <button
                        type="button"
                        onClick={toggleLoginState}
                        className="flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm text-stone-900 transition hover:bg-stone-100"
                      >
                        {isLoggedIn ? <LogOut size={18} className="text-atelier-burnt" /> : <LogIn size={18} className="text-atelier-burnt" />}
                        <span className="flex-1">
                          <span className="block font-semibold">{isLoggedIn ? 'Logout' : 'Login'}</span>
                          <span className="block text-xs text-atelier-muted">
                            {isLoggedIn ? 'Encerrar sessão da demo' : 'Ativar acesso administrativo'}
                          </span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={openAdminPanel}
                        className="mt-1 flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm text-stone-900 transition hover:bg-stone-100"
                      >
                        <ShieldCheck size={18} className="text-atelier-burnt" />
                        <span className="flex-1">
                          <span className="block font-semibold">Acesso administrativo</span>
                          <span className="block text-xs text-atelier-muted">
                            Abrir operação e estoque
                          </span>
                        </span>
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((current) => !current)}
                    aria-expanded={isMenuOpen}
                    aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                    className={`bottom-nav-item w-full ${isMenuOpen || screen.startsWith('admin') ? 'bottom-nav-item-active' : ''}`}
                  >
                    <Menu size={24} />
                    <span>Menu</span>
                  </button>
                </div>
              </div>
            </nav>

            {(screen === 'customer' || screen === 'address' || screen === 'payment') && (
              <div className="checkout-progress-bar">
                <div className="checkout-progress-inner">
                  <button
                    type="button"
                    onClick={checkoutBackScreen}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-stone-700"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>

                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
                    <span className={screen === 'customer' ? 'text-atelier-burnt' : ''}>Dados</span>
                    <span>•</span>
                    <span className={screen === 'address' ? 'text-atelier-burnt' : ''}>Endereço</span>
                    <span>•</span>
                    <span className={screen === 'payment' ? 'text-atelier-burnt' : ''}>Pagamento</span>
                  </div>
                </div>
              </div>
            )}

            <div className="desktop-cart-bar">
              <div className="desktop-cart-bar-inner">
                <div className="text-sm text-atelier-muted">
                  <span className="font-semibold text-atelier-ink">{totalItems}</span> itens no carrinho
                </div>
                <div className="text-sm text-atelier-muted">
                  Total: <span className="font-semibold text-atelier-ink">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}