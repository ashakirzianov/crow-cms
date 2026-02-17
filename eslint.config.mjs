import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'
import stylisticTs from '@stylistic/eslint-plugin-ts'
import parserTs from '@typescript-eslint/parser'


const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
    baseDirectory: __dirname,
})

const eslintConfig = [
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    {
        plugins: {
            '@stylistic/ts': stylisticTs
        },
        languageOptions: {
            parser: parserTs,
        },
        rules: {
            '@stylistic/ts/semi': ['error', 'never'],
            'no-unreachable': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                ignoreRestSiblings: true,
                destructuredArrayIgnorePattern: '^_',
                argsIgnorePattern: '^_',
            }],
        }
    },
]

export default eslintConfig