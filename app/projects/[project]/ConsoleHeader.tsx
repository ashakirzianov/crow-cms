import { NavigationLink } from "@/shared/Atoms"
import { hrefForConsole } from "@/shared/href"

export default function ConsoleHeader({
    project, kinds, tags, selectedFilter, selectedAction, shallow,
}: {
    project: string,
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
                title={project}
                shallow={shallow}
                last
            />{'//'}&nbsp;

            {filters.map((filter, index) => (
                <NavigationLink
                    key={filter}
                    href={hrefForConsole({ project, filter })}
                    title={filter}
                    selected={selectedFilter === filter}
                    shallow={shallow}
                    last={index === filters.length - 1}
                />
            ))}
            &nbsp;//&nbsp;
            <NavigationLink
                href={hrefForConsole({
                    project,
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
                    project,
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
                    project,
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