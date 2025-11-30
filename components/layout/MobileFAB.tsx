"use client"

import React, { useState } from 'react'
import { Plus, Calendar, FlaskConical, X, Layout } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function MobileFAB() {
    const router = useRouter()
    const [open, setOpen] = useState(false)

    return (
        <div className="fixed bottom-20 right-4 md:hidden z-50">
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        size="icon"
                        className="h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-transform duration-200 active:scale-95"
                    >
                        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="mb-2 w-48 p-2">
                    <DropdownMenuItem onClick={() => router.push('/equipment?action=book')} className="gap-2 py-3 cursor-pointer">
                        <Calendar className="h-4 w-4 text-purple-500" />
                        <span>Book Equipment</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/projects?action=new')} className="gap-2 py-3 cursor-pointer">
                        <Layout className="h-4 w-4 text-blue-500" />
                        <span>New Project</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/eln?action=new')} className="gap-2 py-3 cursor-pointer">
                        <FlaskConical className="h-4 w-4 text-emerald-500" />
                        <span>New Experiment</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
