import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Atelier Raízes',
  description: 'Cerâmica artesanal para colorir sua rotina',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
