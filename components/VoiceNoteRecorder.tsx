import React, { useState, useEffect, useRef } from 'react'
import { Button } from './ui/button'
import { Mic, Square, Loader2, Save, Trash2 } from 'lucide-react'
import { useToast } from './ui/use-toast'

interface VoiceNoteRecorderProps {
    onTranscription: (text: string) => void
    isRecording?: boolean
    onRecordingStateChange?: (isRecording: boolean) => void
}

export function VoiceNoteRecorder({
    onTranscription,
    isRecording: externalIsRecording,
    onRecordingStateChange,
}: VoiceNoteRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [isSupported, setIsSupported] = useState(true)
    const recognitionRef = useRef<any>(null)
    const { toast } = useToast()

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition =
                (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition()
                recognition.continuous = true
                recognition.interimResults = true
                recognition.lang = 'en-US'

                recognition.onresult = (event: any) => {
                    let interimTranscript = ''
                    let finalTranscript = ''

                    for (let i = event.resultIndex; i < event.results.length; ++i) {
                        if (event.results[i].isFinal) {
                            finalTranscript += event.results[i][0].transcript
                        } else {
                            interimTranscript += event.results[i][0].transcript
                        }
                    }

                    if (finalTranscript) {
                        setTranscript((prev) => prev + ' ' + finalTranscript)
                    }
                }

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error', event.error)
                    if (event.error === 'not-allowed') {
                        toast({
                            title: 'Microphone Access Denied',
                            description: 'Please allow microphone access to use voice notes.',
                            variant: 'destructive',
                        })
                        stopRecording()
                    }
                }

                recognitionRef.current = recognition
            } else {
                setIsSupported(false)
            }
        }
    }, [])

    const startRecording = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start()
                setIsRecording(true)
                onRecordingStateChange?.(true)
                setTranscript('')
            } catch (e) {
                console.error('Failed to start recording', e)
            }
        }
    }

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop()
            setIsRecording(false)
            onRecordingStateChange?.(false)
        }
    }

    const handleSave = () => {
        if (transcript.trim()) {
            onTranscription(transcript.trim())
            setTranscript('')
            toast({
                title: 'Note Saved',
                description: 'Voice note added to observations.',
            })
        }
    }

    const handleClear = () => {
        setTranscript('')
    }

    if (!isSupported) {
        return (
            <Button variant="ghost" disabled title="Voice notes not supported in this browser">
                <Mic className="h-4 w-4 text-muted-foreground" />
            </Button>
        )
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {!isRecording ? (
                    <Button
                        variant={transcript ? "outline" : "secondary"}
                        size="sm"
                        onClick={startRecording}
                        className={transcript ? "w-auto" : "w-full"}
                    >
                        <Mic className="h-4 w-4 mr-2" />
                        {transcript ? 'Resume Recording' : 'Add Voice Note'}
                    </Button>
                ) : (
                    <Button variant="destructive" size="sm" onClick={stopRecording} className="w-full animate-pulse">
                        <Square className="h-4 w-4 mr-2" />
                        Stop Recording
                    </Button>
                )}

                {transcript && !isRecording && (
                    <>
                        <Button variant="default" size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Save
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleClear}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </>
                )}
            </div>

            {transcript && (
                <div className="p-2 bg-muted rounded-md text-sm italic">
                    "{transcript}"
                </div>
            )}
        </div>
    )
}
