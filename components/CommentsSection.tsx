"use client"

import { useState, useEffect, useMemo } from "react"
import { Comment } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MessageSquare,
  Send,
  Reply,
  Edit2,
  Trash2,
  MoreVertical,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface CommentsSectionProps {
  entityType: Comment["entityType"]
  entityId: string
  teamMembers?: { id: string; name: string }[]
}

export function CommentsSection({
  entityType,
  entityId,
  teamMembers = [],
}: CommentsSectionProps) {
  const { currentUser, currentUserProfile } = useAuth()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [loading, setLoading] = useState(true)

  // Subscribe to comments
  useEffect(() => {
    if (!entityId) return

    const q = query(
      collection(db, "comments"),
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "asc")
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          editedAt: data.editedAt?.toDate?.()?.toISOString(),
          deletedAt: data.deletedAt?.toDate?.()?.toISOString(),
        } as Comment
      })
      setComments(commentsData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [entityType, entityId])

  // Organize comments into threads
  const commentThreads = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentCommentId)
    const replies = comments.filter((c) => c.parentCommentId)

    return topLevel.map((topComment) => ({
      ...topComment,
      replies: replies.filter((r) => r.parentCommentId === topComment.id),
    }))
  }, [comments])

  const handlePostComment = async () => {
    if (!newComment.trim() || !currentUser || !currentUserProfile) return

    try {
      await addDoc(collection(db, "comments"), {
        entityType,
        entityId,
        content: newComment.trim(),
        authorId: currentUserProfile.id,
        authorName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
        threadDepth: 0,
        isEdited: false,
        isDeleted: false,
        createdAt: serverTimestamp(),
      })

      setNewComment("")
    } catch (error) {
      console.error("Error posting comment:", error)
      alert("Failed to post comment. Please try again.")
    }
  }

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyContent.trim() || !currentUser || !currentUserProfile) return

    const parentComment = comments.find((c) => c.id === parentCommentId)
    if (!parentComment) return

    try {
      await addDoc(collection(db, "comments"), {
        entityType,
        entityId,
        content: replyContent.trim(),
        parentCommentId,
        authorId: currentUserProfile.id,
        authorName: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
        threadDepth: parentComment.threadDepth + 1,
        isEdited: false,
        isDeleted: false,
        createdAt: serverTimestamp(),
      })

      setReplyContent("")
      setReplyingTo(null)
    } catch (error) {
      console.error("Error posting reply:", error)
      alert("Failed to post reply. Please try again.")
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return

    try {
      await updateDoc(doc(db, "comments", commentId), {
        content: editContent.trim(),
        isEdited: true,
        editedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setEditingCommentId(null)
      setEditContent("")
    } catch (error) {
      console.error("Error editing comment:", error)
      alert("Failed to edit comment. Please try again.")
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return

    try {
      // Soft delete
      await updateDoc(doc(db, "comments", commentId), {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: currentUser?.uid,
      })
    } catch (error) {
      console.error("Error deleting comment:", error)
      alert("Failed to delete comment. Please try again.")
    }
  }

  const formatTimestamp = (timestamp: string) => {
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

  const CommentCard = ({ comment, isReply = false }: { comment: Comment & { replies?: Comment[] }; isReply?: boolean }) => {
    const isAuthor = currentUserProfile?.id === comment.authorId
    const isEditing = editingCommentId === comment.id

    return (
      <div className={`${isReply ? "ml-10" : ""} mb-3`}>
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-sm font-semibold">
              {comment.authorName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-surface-2 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="font-medium text-sm">{comment.authorName}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatTimestamp(comment.createdAt)}
                  </span>
                  {comment.isEdited && (
                    <span className="text-xs text-muted-foreground ml-1">(edited)</span>
                  )}
                </div>

                {isAuthor && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingCommentId(comment.id)
                          setEditContent(comment.content)
                        }}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[60px]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleEditComment(comment.id)}>
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingCommentId(null)
                        setEditContent("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              )}
            </div>

            {!isReply && !isEditing && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setReplyingTo(comment.id)}
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Reply
                </Button>
              </div>
            )}

            {replyingTo === comment.id && (
              <div className="mt-3 ml-2 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px]"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handlePostReply(comment.id)}>
                    <Send className="h-3 w-3 mr-2" />
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Render replies */}
            {!isReply && comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map((reply) => (
                  <CommentCard key={reply.id} comment={reply} isReply />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Loading comments...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments
          <Badge variant="secondary">{comments.length}</Badge>
        </h3>
      </div>

      {/* New Comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px]"
          disabled={!currentUser}
        />
        <div className="flex justify-end">
          <Button
            onClick={handlePostComment}
            disabled={!newComment.trim() || !currentUser}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {commentThreads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Be the first to comment!</p>
          </div>
        ) : (
          commentThreads.map((comment) => <CommentCard key={comment.id} comment={comment} />)
        )}
      </div>
    </div>
  )
}
