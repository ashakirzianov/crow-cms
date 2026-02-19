import { NextRequest, NextResponse } from 'next/server'

const ALIKRO_URL = process.env.ALIKRO_URL ?? 'http://localhost:3000'
const ALIKRO_DOMAIN = ALIKRO_URL.startsWith('https://')
    ? ALIKRO_URL.substring('https://'.length)
    : ALIKRO_URL.substring('http://'.length)

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    `https://${ALIKRO_DOMAIN}`,
    `https://www.${ALIKRO_DOMAIN}`,
]

function getCorsHeaders(origin: string | null): Record<string, string> | null {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    }
    return null
}

export function proxy(request: NextRequest) {
    const origin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: corsHeaders ?? undefined,
        })
    }

    const response = NextResponse.next()
    if (corsHeaders) {
        for (const [key, value] of Object.entries(corsHeaders)) {
            response.headers.set(key, value)
        }
    }
    return response
}

export const config = {
    matcher: '/api/:path*',
}
