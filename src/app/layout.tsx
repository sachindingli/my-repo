import './globals.css'

export const metadata = {
  title: 'Deengli Sarpanch Poll',
  description: 'Anonymous community poll for the Deengli Gram Panchayat Sarpanch candidates.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
