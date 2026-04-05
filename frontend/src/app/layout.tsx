import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Giám sát Xâm nhập mặn ĐBSCL',
  description: 'Hệ thống WebGIS giám sát xâm nhập mặn Đồng bằng Sông Cửu Long',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
