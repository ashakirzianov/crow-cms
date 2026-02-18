import '@/app/globals.css'
import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

const inter = Inter({ subsets: ['latin'] })

const title = 'Console'
const description = 'Admin console for the website'
export const metadata: Metadata = {
    title, description,
    openGraph: {
        title, description,
    },
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Analytics />
            </body>
        </html>
    )
}
