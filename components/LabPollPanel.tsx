"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { LabPoll, LabPollResponse } from "@/lib/types"
import { Plus, MessageSquare, Users, CheckCircle2, X, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

interface LabPollPanelProps {
  polls: LabPoll[]
  currentUserProfile: any // PersonProfile
  people: Array<{ id: string; name: string }>
  onCreatePoll: (poll: LabPoll) => void
  onRespondToPoll: (pollId: string, optionIds: string[]) => void
  onDeletePoll: (pollId: string) => void
}

export function LabPollPanel({
  polls,
  currentUserProfile,
  people,
  onCreatePoll,
  onRespondToPoll,
  onDeletePoll,
}: LabPollPanelProps) {
  const { toast } = useToast()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', ''] as string[], // Start with 2 empty options
  })

  // Filter polls by lab
  const labPolls = useMemo(() => {
    if (!currentUserProfile?.labId) return []
    return polls.filter(poll => poll.labId === currentUserProfile.labId)
  }, [polls, currentUserProfile?.labId])

  // Get user's response for a poll
  const getUserResponse = (poll: LabPoll): string[] => {
    const response = poll.responses?.find(r => r.userId === currentUserProfile?.id)
    return response?.selectedOptionIds || []
  }

  // Get response count for an option
  const getOptionResponseCount = (poll: LabPoll, optionId: string): number => {
    return poll.responses?.filter(r => r.selectedOptionIds.includes(optionId)).length || 0
  }

  // Get all users who responded to an option
  const getOptionRespondents = (poll: LabPoll, optionId: string): Array<{ id: string; name: string }> => {
    const respondingUserIds = poll.responses
      ?.filter(r => r.selectedOptionIds.includes(optionId))
      .map(r => r.userId) || []

    return respondingUserIds
      .map(userId => people.find(p => p.id === userId))
      .filter((p): p is { id: string; name: string } => p !== undefined)
  }

  const handleCreatePoll = () => {
    if (!newPoll.question.trim() || newPoll.options.filter(o => o.trim()).length < 2) {
      toast({
        title: "Invalid Poll",
        description: "Please enter a question and at least 2 options",
        variant: "destructive",
      })
      return
    }

    const poll: LabPoll = {
      id: `poll-${Date.now()}`,
      question: newPoll.question.trim(),
      options: newPoll.options.filter(o => o.trim()).map((option, idx) => ({
        id: `option-${idx}`,
        text: option.trim(),
      })),
      labId: currentUserProfile?.labId || '',
      createdBy: currentUserProfile?.id || '',
      createdAt: new Date().toISOString(),
      responses: [],
    }

    onCreatePoll(poll)
    setNewPoll({ question: '', options: ['', ''] })
    setIsCreateModalOpen(false)
  }

  const handleToggleOption = (poll: LabPoll, optionId: string) => {
    const currentSelection = getUserResponse(poll)
    const newSelection = currentSelection.includes(optionId)
      ? currentSelection.filter(id => id !== optionId)
      : [...currentSelection, optionId]

    onRespondToPoll(poll.id, newSelection)
  }

  const handleAddOption = () => {
    setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })
  }

  const handleRemoveOption = (index: number) => {
    if (newPoll.options.length <= 2) {
      toast({
        title: "Cannot Remove Option",
        description: "Poll must have at least 2 options",
        variant: "destructive",
      })
      return
    }
    setNewPoll({
      ...newPoll,
      options: newPoll.options.filter((_, i) => i !== index)
    })
  }

  const handleOptionChange = (index: number, value: string) => {
    const updated = [...newPoll.options]
    updated[index] = value
    setNewPoll({ ...newPoll, options: updated })
  }

  return (
    <div className="card-monday">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-brand-500" aria-hidden />
          <div>
            <h2 className="h2 text-foreground">Lab Polls</h2>
            <p className="text-sm text-muted-foreground">Ask questions and gather lab availability or preferences.</p>
          </div>
        </div>
        <Button
          className="bg-brand-500 text-white hover:bg-brand-600 gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create Poll
        </Button>
      </header>

      <div className="space-y-4 max-h-[50vh] md:max-h-[420px] overflow-y-auto pr-1">
        {labPolls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-12 text-center text-muted-foreground">
            <MessageSquare className="mb-3 h-12 w-12 opacity-50" />
            <p className="font-medium">No polls yet.</p>
            <p className="text-sm">Create a poll to gather lab feedback.</p>
          </div>
        ) : (
          labPolls.map((poll) => {
            const userResponse = getUserResponse(poll)
            const totalResponses = poll.responses?.length || 0

            return (
              <div
                key={poll.id}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-foreground">{poll.question}</h3>
                      {poll.createdBy === currentUserProfile?.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this poll?")) {
                              onDeletePoll(poll.id)
                            }
                          }}
                          title="Delete poll"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Created {new Date(poll.createdAt).toLocaleDateString()} • {totalResponses} response{totalResponses !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {poll.options.map((option) => {
                    const isSelected = userResponse.includes(option.id)
                    const responseCount = getOptionResponseCount(poll, option.id)
                    const respondents = getOptionRespondents(poll, option.id)

                    return (
                      <div
                        key={option.id}
                        className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${isSelected
                            ? 'bg-brand-50 border-brand-500'
                            : 'bg-gray-50 border-border hover:border-brand-300'
                          }`}
                        onClick={() => handleToggleOption(poll, option.id)}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                            ? 'bg-brand-500 border-brand-500'
                            : 'border-gray-300'
                          }`}>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{option.text}</span>
                            <Badge variant="outline" className="text-xs ml-2">
                              {responseCount} {responseCount === 1 ? 'vote' : 'votes'}
                            </Badge>
                          </div>
                          {respondents.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <Users className="h-3 w-3 text-muted-foreground" />
                              {respondents.slice(0, 3).map((person) => (
                                <Badge key={person.id} variant="secondary" className="text-xs">
                                  {person.name}
                                </Badge>
                              ))}
                              {respondents.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{respondents.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {userResponse.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      You selected: {userResponse.map(id => poll.options.find(o => o.id === id)?.text).filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Create Poll Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Question *</Label>
              <Textarea
                value={newPoll.question}
                onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                placeholder="e.g., What day should we do the bins?"
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Options * (at least 2 required)</Label>
              <div className="space-y-2 mt-2">
                {newPoll.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1} (e.g., Monday)`}
                      className="flex-1"
                    />
                    {newPoll.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePoll}
                className="bg-brand-500 hover:bg-brand-600 text-white"
              >
                Create Poll
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

