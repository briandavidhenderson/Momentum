"use client"

import { useState, useEffect, useRef } from "react"
import { PersonProfile, Conversation, Message } from "@/lib/types"
import { useProfiles } from "@/lib/useProfiles"
import {
  getOrCreateConversation,
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
  markMessagesAsRead
} from "@/lib/firestoreService"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, Search, X } from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"

interface MessengerViewProps {
  currentUserProfile?: PersonProfile | null
}

export function MessengerView({ currentUserProfile }: MessengerViewProps) {
  const { currentUser } = useAuth()
  const allProfiles = useProfiles(null) || []

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessageContent, setNewMessageContent] = useState("")
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Subscribe to conversations
  useEffect(() => {
    if (!currentUserProfile?.id) return

    const unsubscribe = subscribeToConversations(currentUserProfile.id, (convos) => {
      setConversations(convos)
    })

    return () => unsubscribe()
  }, [currentUserProfile?.id])

  // Subscribe to messages in selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([])
      return
    }

    const unsubscribe = subscribeToMessages(selectedConversation.id, (msgs) => {
      setMessages(msgs)
    })

    // Mark messages as read when conversation is opened
    if (currentUserProfile?.id) {
      markMessagesAsRead(selectedConversation.id, currentUserProfile.id)
    }

    return () => unsubscribe()
  }, [selectedConversation, currentUserProfile?.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!selectedConversation || !currentUserProfile || !newMessageContent.trim()) return

    try {
      await sendMessage(
        selectedConversation.id,
        currentUserProfile.id,
        currentUserProfile,
        newMessageContent.trim()
      )
      setNewMessageContent("")
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Handle starting a new conversation
  const handleStartConversation = async (recipientProfile: PersonProfile) => {
    if (!currentUserProfile) return

    try {
      const conversation = await getOrCreateConversation(
        currentUserProfile.id,
        recipientProfile.id,
        currentUserProfile,
        recipientProfile
      )
      setSelectedConversation(conversation)
      setShowNewConversation(false)
      setSearchQuery("")
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  // Get other participant in a conversation
  const getOtherParticipant = (conversation: Conversation): string => {
    const otherParticipantIndex = conversation.participantIds.findIndex(
      id => id !== currentUserProfile?.id
    )
    return conversation.participantNames[otherParticipantIndex] || "Unknown"
  }

  // Filter profiles for new conversation
  const filteredProfiles = allProfiles.filter(p => {
    if (p.id === currentUserProfile?.id) return false
    if (!searchQuery) return true
    const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase()) || p.email.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Format timestamp
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (!currentUserProfile) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please complete your profile to use messaging.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Direct messaging with team members</p>
        </div>
        <Button
          onClick={() => setShowNewConversation(true)}
          className="bg-brand-500 text-white hover:bg-brand-600"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-300px)]">
        {/* Conversations List */}
        <div className="lg:col-span-1 bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-1">Start a new conversation to get started</p>
              </div>
            ) : (
              conversations.map((conversation) => {
                const isSelected = selectedConversation?.id === conversation.id
                const unreadCount = conversation.unreadCounts?.[currentUserProfile.id] || 0
                const otherParticipant = getOtherParticipant(conversation)

                return (
                  <div
                    key={conversation.id}
                    role="button"
                    tabIndex={0}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors ${
                      isSelected ? "bg-muted" : ""
                    }`}
                    onClick={() => setSelectedConversation(conversation)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedConversation(conversation)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground truncate">{otherParticipant}</p>
                          {unreadCount > 0 && (
                            <span className="bg-brand-500 text-white text-xs px-2 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {conversation.lastMessageContent || "No messages yet"}
                        </p>
                      </div>
                      {conversation.lastMessageAt && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatTimestamp(conversation.lastMessageAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2 bg-card rounded-lg border border-border overflow-hidden flex flex-col">
          {selectedConversation ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">
                  {getOtherParticipant(selectedConversation)}
                </h2>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isCurrentUser = message.senderId === currentUserProfile.id

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isCurrentUser
                              ? "bg-brand-500 text-white"
                              : "bg-muted text-foreground"
                          }`}
                        >
                          {!isCurrentUser && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${isCurrentUser ? "text-white/70" : "text-muted-foreground"}`}>
                            {formatTimestamp(message.createdAt)}
                            {message.read && isCurrentUser && " • Read"}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessageContent.trim()}
                    className="bg-brand-500 text-white hover:bg-brand-600"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowNewConversation(false)}
        >
          <div
            className="bg-card rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">New Message</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewConversation(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search people..."
                  className="flex-1 border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-brand-500"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredProfiles.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p>No people found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      role="button"
                      tabIndex={0}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleStartConversation(profile)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStartConversation(profile)}
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center font-medium">
                        {profile.firstName[0]}{profile.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">
                          {profile.firstName} {profile.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{profile.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
