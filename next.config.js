/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: process.env.NEXT_PUBLIC_ASSETS_DOMAIN,
                port: '',
                pathname: '/**',
                search: '',
            },
        ],
        minimumCacheTTL: 2678400, // 31 days
    }
}

module.exports = nextConfig
