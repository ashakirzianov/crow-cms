import { NavigationLink } from "@/shared/Atoms"
import { hrefForConsole } from "@/shared/href"

export default function ConsoleHeader({
    kinds, tags, selectedFilter, selectedAction, shallow,
}: {
    kinds: string[],
    tags: string[],
    selectedFilter: string,
    selectedAction: string | undefined,
    shallow?: boolean,
}) {
    const filters = ['all', ...kinds, ...tags]
    return (
        <nav className="flex flex-row flex-wrap text-accent text-2xl sm:text-5xl whitespace-nowrap pb-2">
            <NavigationLink
                href="/"
                title="Alikro"
                shallow={shallow}
                last
            />{'//'}&nbsp;

            {filters.map((filter, index) => (
                <NavigationLink
                    key={filter}
                    href={hrefForConsole({ filter })}
                    title={filter}
                    selected={selectedFilter === filter}
                    shallow={shallow}
                    last={index === filters.length - 1}
                />
            ))}
            &nbsp;//&nbsp;
            <NavigationLink
                href={hrefForConsole({
                    filter: selectedFilter,
                    action: 'upload',
                })}
                title="Upload"
                selected={selectedAction === 'upload'}
                shallow={shallow}
                last
            />
            &nbsp;//&nbsp;
            <NavigationLink
                href={hrefForConsole({
                    filter: selectedFilter,
                    action: 'json',
                })}
                title="Json"
                selected={selectedAction === 'json'}
                shallow={shallow}
                last
            />
            &nbsp;//&nbsp;
            <NavigationLink
                href={hrefForConsole({
                    filter: selectedFilter,
                    action: 'workers',
                })}
                title="Workers"
                selected={selectedAction === 'workers'}
                shallow={shallow}
                last
            />
        </nav>
    )
}