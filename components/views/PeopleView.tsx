
"use client"

import { PersonProfile } from "@/lib/types";

export default function PeopleView({ currentUserProfile }: { currentUserProfile: PersonProfile | null }) {
    return (
        <div>
            <h1 className="text-2xl font-bold">People View</h1>
            <p>Current User: {currentUserProfile?.firstName}</p>
        </div>
    )
}
