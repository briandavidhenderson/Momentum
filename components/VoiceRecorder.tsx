"use client"

import React, { useState, useRef, useEffect } from "react"
import { Mic, Square, Play, Pause, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, audioFile: File) => void
  onCancel?: () => void
  maxDuration?: number // seconds, default 300 (5 minutes)
}

/**
 * Voice Recorder Component
 * Records audio using MediaRecorder API
 * Provides playback, duration display, and audio file export
 */
export function VoiceRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioURL, setAudioURL] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [audioURL])

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Start recording
  const startRecording = async () => {
    try {
      setError(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Handle recording stop
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(blob)

        const url = URL.createObjectURL(blob)
        setAudioURL(url)

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)
      setIsPaused(false)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return newTime
        })
      }, 1000)
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setError("Failed to access microphone. Please check permissions.")
    }
  }

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause()
      setIsPaused(true)

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume()
      setIsPaused(false)

      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1
          if (newTime >= maxDuration) {
            stopRecording()
            return maxDuration
          }
          return newTime
        })
      }, 1000)
    }
  }

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  // Play audio
  const playAudio = () => {
    if (audioURL && audioElementRef.current) {
      audioElementRef.current.play()
      setIsPlaying(true)
    }
  }

  // Pause audio playback
  const pauseAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      setIsPlaying(false)
    }
  }

  // Delete recording
  const deleteRecording = () => {
    if (audioURL) {
      URL.revokeObjectURL(audioURL)
    }

    setAudioBlob(null)
    setAudioURL(null)
    setRecordingTime(0)
    setIsPlaying(false)
    audioChunksRef.current = []
  }

  // Submit recording
  const submitRecording = () => {
    if (audioBlob) {
      // Create File object from Blob
      const audioFile = new File(
        [audioBlob],
        `voice-note-${Date.now()}.webm`,
        { type: "audio/webm" }
      )

      onRecordingComplete(audioBlob, audioFile)
    }
  }

  // Calculate cost estimate
  const estimatedCost = ((recordingTime / 60) * 0.006).toFixed(3)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Voice Recorder</h3>
        <span className="text-sm text-gray-500">
          {formatTime(recordingTime)} / {formatTime(maxDuration)}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Waveform Visualization Placeholder */}
      <div className="h-20 bg-gray-100 rounded flex items-center justify-center">
        {isRecording && !isPaused ? (
          <div className="flex items-center gap-1">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-brand-500 rounded animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 10}px`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>
        ) : (
          <span className="text-gray-400 text-sm">
            {audioBlob ? "Recording Complete" : "Ready to record"}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {!isRecording && !audioBlob && (
          <Button
            onClick={startRecording}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-full"
          >
            <Mic className="h-5 w-5 mr-2" />
            Start Recording
          </Button>
        )}

        {isRecording && !isPaused && (
          <>
            <Button
              onClick={pauseRecording}
              variant="outline"
              className="px-6 py-3 rounded-full"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </Button>
            <Button
              onClick={stopRecording}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-full"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop
            </Button>
          </>
        )}

        {isRecording && isPaused && (
          <>
            <Button
              onClick={resumeRecording}
              className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-3 rounded-full"
            >
              <Mic className="h-5 w-5 mr-2" />
              Resume
            </Button>
            <Button
              onClick={stopRecording}
              className="bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-full"
            >
              <Square className="h-5 w-5 mr-2" />
              Stop
            </Button>
          </>
        )}

        {audioBlob && !isRecording && (
          <>
            {!isPlaying ? (
              <Button
                onClick={playAudio}
                variant="outline"
                className="px-6 py-3 rounded-full"
              >
                <Play className="h-5 w-5 mr-2" />
                Play
              </Button>
            ) : (
              <Button
                onClick={pauseAudio}
                variant="outline"
                className="px-6 py-3 rounded-full"
              >
                <Pause className="h-5 w-5 mr-2" />
                Pause
              </Button>
            )}
            <Button
              onClick={deleteRecording}
              variant="outline"
              className="px-4 py-3 rounded-full text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Audio element for playback */}
      {audioURL && (
        <audio
          ref={audioElementRef}
          src={audioURL}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Info & Actions */}
      {audioBlob && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Duration: {formatTime(recordingTime)}</span>
            <span>Est. Cost: ${estimatedCost}</span>
          </div>

          <div className="flex gap-3">
            {onCancel && (
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={submitRecording}
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Transcribe & Structure
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !audioBlob && (
        <div className="text-sm text-gray-500 text-center space-y-1">
          <p>Click &ldquo;Start Recording&rdquo; to capture voice notes</p>
          <p className="text-xs">
            Speak clearly about your protocol steps, materials, and equipment
          </p>
        </div>
      )}
    </div>
  )
}
