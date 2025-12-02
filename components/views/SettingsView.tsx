"use client"

import { CustomFieldEditor } from "@/components/settings/CustomFieldEditor"
import { Settings } from "lucide-react"

export function SettingsView() {
    return (
        <div className="h-[calc(100vh-8rem)] flex flex-col gap-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings className="h-6 w-6 text-brand-500" />
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your lab configuration and preferences
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pb-10">
                <div className="space-y-8 max-w-5xl mx-auto">

                    {/* Lab Settings Section */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold">Lab Configuration</h2>
                            <p className="text-sm text-muted-foreground">
                                Customize how your lab captures data.
                            </p>
                        </div>

                        <CustomFieldEditor />
                    </section>

                </div>
            </div>
        </div>
    )
}
