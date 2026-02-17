'use server'
import { cookies } from "next/headers"
import crypto from "crypto"

export async function isAuthenticated() {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        console.error('No auth secret provided')
        return false
    }
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('auth')
    if (authCookie) {
        return validateAuthToken(authCookie.value, secret)
    }
    return false
}

export async function authenticate(password: string) {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        console.error('No auth secret provided')
        return false
    }
    if (validatePassword(password, secret)) {
        const cookieStore = await cookies()
        const value = generateAuthToken(secret)
        cookieStore.set({
            name: 'auth',
            value,
            httpOnly: true,
        })
    }

}

export async function generateNewPassword() {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        return undefined
    }
    const password = generatePassword(secret)
    return password
}

function validatePassword(password: string, server_secret: string) {
    return validateToken(password, 'password', 16, server_secret)
}

function generatePassword(server_secret: string) {
    return generateToken('password', 16, server_secret)
}

function validateAuthToken(token: string, server_secret: string) {
    return validateToken(token, 'alikro', 32, server_secret)
}

function generateAuthToken(server_secret: string) {
    return generateToken('alikro', 32, server_secret)
}

function generateToken(message: string, length: number, server_secret: string): string {
    const hmac = crypto.createHmac('sha256', server_secret)
    hmac.update(message)
    const fullHash = hmac.digest('hex') // 64 chars (hex of 32-byte hash)

    // Include message hash + actual message, truncate if needed
    const base = Buffer.from(fullHash).toString('base64url')

    if (base.length > length) {
        return base.slice(0, length)
    } else if (base.length < length) {
        // Pad with deterministic characters if you must hit length exactly (optional)
        return base + '0'.repeat(length - base.length)
    }

    return base
}

/**
 * Validates that a token was created using the secret and contains the given message.
 */
function validateToken(token: string, message: string, length: number, server_secret: string): boolean {
    if (token.length !== length) {
        return false
    }
    const expected = generateToken(message, length, server_secret)
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected))
}