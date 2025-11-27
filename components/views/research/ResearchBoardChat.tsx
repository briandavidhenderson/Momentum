import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/hooks/useAuth';
import { subscribeToBoardMessages, sendBoardMessage } from '@/lib/services/researchBoardService';
import { useResearchBoardDetails } from '@/lib/hooks/useResearchBoards';
import { BoardMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface ResearchBoardChatProps {
    boardId: string;
}

export function ResearchBoardChat({ boardId }: ResearchBoardChatProps) {
    const { currentUser, currentUserProfile } = useAuth();
    const { board } = useResearchBoardDetails(boardId);
    const [messages, setMessages] = useState<BoardMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Avoid subscribing if user cannot access the board to prevent permission-denied crashes
        if (!currentUser || !currentUserProfile) return;
        const isMember = board?.members?.includes(currentUser.uid) || (board?.labId && board.labId === currentUserProfile.labId);
        if (!isMember) {
            setMessages([]);
            return;
        }

        const unsubscribe = subscribeToBoardMessages(boardId, (msgs) => {
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, [boardId, board?.members, board?.labId, currentUser, currentUserProfile]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !currentUser || !currentUserProfile) return;
        // Basic membership gate
        const isMember = board?.members?.includes(currentUser.uid) || (board?.labId && board.labId === currentUserProfile.labId);
        if (!isMember) {
            alert('You do not have permission to post to this board.');
            return;
        }

        const content = newMessage;
        setNewMessage(''); // Optimistic clear

        try {
            await sendBoardMessage(
                boardId,
                content,
                {
                    userId: currentUser.uid,
                    name: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`,
                    avatar: currentUserProfile.avatarUrl
                }
            );
        } catch (err) {
            console.error('Failed to send board message', err);
            alert('Failed to send message. Please try again.');
            // Restore text so user can retry
            setNewMessage(content);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200 w-80 shadow-xl z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <MessageSquareIcon className="h-4 w-4 text-indigo-600" />
                    Board Chat
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messages.length === 0 ? (
                    <div className="text-center text-slate-400 text-sm mt-10">
                        <p>No messages yet.</p>
                        <p>Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        if (!msg.author) return null;
                        const isMe = msg.author.userId === currentUser?.uid;

                        let timeString = '';
                        try {
                            timeString = formatDistanceToNow(msg.createdAt, { addSuffix: true });
                        } catch (e) {
                            timeString = 'just now';
                        }

                        return (
                            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <Avatar className="h-8 w-8 mt-1">
                                    <AvatarImage src={msg.author.avatar} />
                                    <AvatarFallback className="text-[10px] bg-slate-200">
                                        {msg.author.name?.[0] || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div className={`px-3 py-2 rounded-lg text-sm ${isMe
                                        ? 'bg-indigo-600 text-white rounded-tr-none'
                                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-1">
                                        {msg.author.name || 'Unknown'} • {timeString}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-white"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}

function MessageSquareIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}
