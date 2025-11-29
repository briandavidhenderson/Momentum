import React, { useState } from 'react'
import { QrReader } from 'react-qr-reader'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Scan, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { parseQRPayload } from '@/lib/services/qrService'
import { useToast } from './ui/use-toast'

interface QRCodeScannerProps {
    onScan?: (data: string) => void
    trigger?: React.ReactNode
}

export function QRCodeScanner({ onScan, trigger }: QRCodeScannerProps) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const { toast } = useToast()

    const handleScan = (result: any, error: any) => {
        if (result) {
            const data = result?.text
            if (data) {
                setOpen(false)
                if (onScan) {
                    onScan(data)
                } else {
                    // Default behavior: try to navigate
                    const route = parseQRPayload(data)
                    if (route) {
                        router.push(route)
                        toast({
                            title: 'Scanned Successfully',
                            description: `Navigating to ${route}`,
                        })
                    } else {
                        toast({
                            title: 'Invalid QR Code',
                            description: 'This QR code is not recognized by Momentum.',
                            variant: 'destructive',
                        })
                    }
                }
            }
        }
        if (error) {
            // console.info(error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="icon">
                        <Scan className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-sm aspect-square relative overflow-hidden rounded-lg border bg-black">
                        {open && (
                            <QrReader
                                onResult={handleScan}
                                constraints={{ facingMode: 'environment' }}
                                className="w-full h-full"
                            />
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                        Point your camera at a Momentum QR code to scan.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
