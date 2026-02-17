import clsx from "clsx"
import Link from "next/link"
import { MouseEventHandler } from "react"

export function NavigationLink({
    href, title, selected, last, shallow,
}: {
    href: string,
    title: string,
    selected?: boolean,
    last?: boolean,
    shallow?: boolean,
}) {
    return <span>
        <Link href={href} shallow={shallow} className={clsx(
            'cursor-pointer', {
            'bg-accent text-secondary': selected,
            'text-accent hover:bg-accent hover:text-secondary': !selected
        }
        )}>
            {title}
        </Link>{last ? '' : ','}&nbsp;
    </span>
}

export function Button({
    text, kind,
    type, name, value, disabled,
    onClick,
}: {
    text: string,
    kind?: 'gray',
    type?: 'submit' | 'button',
    name?: string,
    value?: string,
    disabled?: boolean,
    onClick?: MouseEventHandler<HTMLButtonElement> | undefined,
}) {
    return <button
        type={type}
        name={name}
        value={value}
        onClick={onClick}
        disabled={disabled}
        className={clsx(
            'px-4 py-2 rounded-md transition-colors', {
            'bg-accent text-secondary hover:bg-accent/90': kind === undefined,
            'bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300': kind === 'gray'
        }
        )}
    >
        {text}
    </button>
}