'use server'
import { cookies } from "next/headers"
import crypto from "crypto"

const authorizations: Record<string, string[]> = {
    alikro: ['alikro', 'ashakirzianov'],
}

export async function isAuthorized(project: string) {
    const username = await currentUsername()
    if (username === null) {
        return false
    }
    const authorizedUsers = authorizations[project]
    if (!authorizedUsers) {
        console.warn(`No authorization config found for project "${project}", denying access by default`)
        return false
    }
    return authorizedUsers.includes(username)
}

async function currentUsername() {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        console.error('No auth secret provided')
        return null
    }
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('auth')
    if (authCookie) {
        const validationResult = validateAuthToken(authCookie.value, secret)
        if (validationResult.success) {
            return validationResult.username
        }
    }
    return null
}

export async function authenticate(username: string, password: string) {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        console.error('No auth secret provided')
        return false
    }
    if (validatePassword(username, password, secret)) {
        const cookieStore = await cookies()
        const value = generateAuthToken(username, secret)
        cookieStore.set({
            name: 'auth',
            value,
            httpOnly: true,
        })
    } else {
        return false
    }

}

export async function generateNewPassword(username: string) {
    const secret = process.env.AUTH_SECRET
    if (!secret) {
        return undefined
    }
    const password = generatePassword(username, secret)
    return password
}

function validatePassword(username: string, password: string, server_secret: string) {
    return validateToken(password, username, 16, server_secret)
}

function generatePassword(username: string, server_secret: string) {
    return generateToken(username, 16, server_secret)
}

function validateAuthToken(token: string, server_secret: string) {
    const [username, tokenPart] = token.split(':')
    if (tokenPart === undefined) {
        return {
            success: false, message: 'Invalid token format',
        } as const
    }
    const isValid = validateToken(tokenPart, username, 32, server_secret)
    if (!isValid) {
        return {
            success: false, message: 'Invalid token',
        } as const
    }
    return {
        success: true,
        username,
    } as const
}

function generateAuthToken(username: string, server_secret: string) {
    const tokenPart = generateToken(username, 32, server_secret)
    return `${username}:${tokenPart}`
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