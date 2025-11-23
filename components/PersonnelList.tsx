import { Person } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface PersonnelListProps {
    people: Person[];
}

export function PersonnelList({ people }: PersonnelListProps) {
    return (
        <div className="space-y-2 p-2">
            {people.map((person) => (
                <div
                    key={person.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-grab active:cursor-grabbing border border-transparent hover:border-border"
                    draggable
                    onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", person.id);
                        e.dataTransfer.effectAllowed = "copy";
                    }}
                >
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={person.avatarUrl} />
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{person.role}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
