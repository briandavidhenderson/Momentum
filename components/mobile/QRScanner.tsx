"use client"

import { useState } from "react"
import { QrReader } from "react-qr-reader"
import { Button } from "@/components/ui/button"
import { X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/toast"

interface QRScannerProps {
    onClose: () => void
}

export function QRScanner({ onClose }: QRScannerProps) {
    const [data, setData] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const toast = useToast()

    const handleScan = (result: any, error: any) => {
        if (!!result) {
            const scanData = result?.text
            setData(scanData)

            // Attempt to parse URL or ID
            // Expected formats:
            // - https://app.momentum.lab/equipment/123
            // - equipment:123
            // - sample:456

            try {
                if (scanData.includes("equipment/")) {
                    const id = scanData.split("equipment/")[1]
                    router.push(`/equipment?id=${id}`)
                    onClose()
                } else if (scanData.startsWith("equipment:")) {
                    const id = scanData.split(":")[1]
                    router.push(`/equipment?id=${id}`)
                    onClose()
                } else if (scanData.includes("sample/")) {
                    const id = scanData.split("sample/")[1]
                    router.push(`/inventory?sampleId=${id}`)
                    onClose()
                } else {
                    toast.info(`Scanned: ${scanData}`)
                }
            } catch (e) {
                console.error("Error parsing QR code", e)
            }
        }

        if (!!error) {
            // QR Reader throws errors constantly when no code is found, ignore them
            // console.info(error);
        }
    }

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            <div className="flex justify-between items-center p-4 text-white">
                <h2 className="font-semibold">Scan QR Code</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                    <X className="h-6 w-6" />
                </Button>
            </div>

            <div className="flex-1 flex items-center justify-center bg-black relative">
                <div className="w-full max-w-sm aspect-square relative overflow-hidden rounded-lg border-2 border-white/50">
                    <QrReader
                        onResult={handleScan}
                        constraints={{ facingMode: 'environment' }}
                        className="w-full h-full object-cover"
                        videoContainerStyle={{ paddingTop: '100%' }}
                        videoStyle={{ objectFit: 'cover' }}
                    />

                    {/* Scanning Overlay */}
                    <div className="absolute inset-0 border-2 border-brand-500 opacity-50 animate-pulse pointer-events-none" />
                </div>

                {!data && (
                    <div className="absolute bottom-20 text-white text-sm bg-black/50 px-4 py-2 rounded-full">
                        Point camera at a QR code
                    </div>
                )}
            </div>
        </div>
    )
}
