"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, BrainCircuit } from 'lucide-react';
import { answerQuestionAboutPin } from '@/lib/ai/geminiAgent';
import type { ResearchPin } from '@/lib/types';
import { logger } from '@/lib/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ResearchPinQADialogProps {
  open: boolean;
  onClose: () => void;
  pin: ResearchPin | null;
  initialQuestion?: string;
}

export function ResearchPinQADialog({ open, onClose, pin, initialQuestion = '' }: ResearchPinQADialogProps) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e?: React.FormEvent, questionText?: string) => {
    e?.preventDefault();

    if (!pin || loading) return;

    const questionToSubmit = questionText || question.trim();
    if (!questionToSubmit) return;

    setQuestion('');
    setLoading(true);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: questionToSubmit,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      // Get conversation history
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // Get AI answer
      const answer = await answerQuestionAboutPin(pin, questionToSubmit, conversationHistory);

      // Add assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      logger.error('Error getting AI answer', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Initialize messages with pin context when dialog opens
  useEffect(() => {
    if (open && pin) {
      // Add a welcome message with pin context
      const welcomeMessage: Message = {
        role: 'assistant',
        content: `I can help you understand this ${pin.type}: "${pin.title || 'Untitled'}". What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);

      // Set initial question if provided
      if (initialQuestion) {
        setQuestion(initialQuestion);
        // Auto-submit the initial question
        setTimeout(() => {
          handleSubmit(undefined, initialQuestion);
        }, 100);
      } else {
        setQuestion('');
      }
    } else if (!open) {
      // Clear messages when dialog closes
      setMessages([]);
      setQuestion('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pin, initialQuestion]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);


  if (!pin) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-indigo-600" />
            Ask AI about this {pin.type}
          </DialogTitle>
          <DialogDescription>
            {pin.title || 'Untitled'}
          </DialogDescription>
        </DialogHeader>

        {/* Pin Context Summary */}
        {pin.aiSummary && (
          <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-sm">
            <div className="font-semibold text-indigo-700 mb-1">Summary:</div>
            <p className="text-slate-700">{pin.aiSummary}</p>
          </div>
        )}

        {/* Chat Messages */}
        <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] border rounded-lg p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-900'
                    }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-lg p-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-600">Thinking...</span>
                </div>
              </div>
            )}
            {messages.length === 1 && messages[0].role === 'assistant' && (
              <div className="flex flex-wrap gap-2 mt-2 px-2">
                {(pin.type === 'paper' ? [
                  "Summarize the key findings", "What methodology was used?", "What are the limitations?"
                ] : pin.type === 'figure' ? [
                  "Explain this figure", "What trends are shown?", "Is there statistical significance?"
                ] : pin.type === 'video' ? [
                  "Summarize the video", "What are the main points?", "List key takeaways"
                ] : [
                  "Summarize this", "Key takeaways", "Explain in simple terms"
                ]).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(undefined, q)}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="flex gap-2 pt-4 border-t">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about this research..."
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

