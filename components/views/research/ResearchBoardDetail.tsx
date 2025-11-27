"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Heart,
  Share2,
  BrainCircuit,
  Image as ImageIcon,
  Loader2,
  Edit,
  Trash2,
  Lock,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useResearchBoard } from '@/lib/hooks/useResearchBoard';
import { useResearchBoardDetails } from '@/lib/hooks/useResearchBoards';
import { useAuth } from '@/lib/hooks/useAuth';
import type { ResearchPin } from '@/lib/types';
import { ResearchPinDialog } from '@/components/dialogs/ResearchPinDialog';
import { ResearchPinQADialog } from '@/components/dialogs/ResearchPinQADialog';
import { ResearchBoardChat } from './ResearchBoardChat';
import { analyzeResearchPin } from '@/lib/services/researchAIService';
import { logger } from '@/lib/logger';

interface ResearchBoardDetailProps {
  boardId: string;
  onBack: () => void;
}

export default function ResearchBoardDetail({ boardId, onBack }: ResearchBoardDetailProps) {
  const { pins, loading, searchQuery, setSearchQuery, deletePin } = useResearchBoard(boardId);
  const { board, loading: boardLoading } = useResearchBoardDetails(boardId);
  const { currentUser, currentUserProfile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPin, setEditingPin] = useState<ResearchPin | null>(null);
  const [qaDialogOpen, setQaDialogOpen] = useState(false);
  const [selectedPinForQA, setSelectedPinForQA] = useState<ResearchPin | null>(null);
  const [initialQuestion, setInitialQuestion] = useState<string>('');
  const [quickQuestion, setQuickQuestion] = useState<{ [pinId: string]: string }>({});
  const [showChat, setShowChat] = useState(true);

  const handleAddPin = () => {
    setEditingPin(null);
    setDialogOpen(true);
  };

  const handleEditPin = (pin: ResearchPin) => {
    setEditingPin(pin);
    setDialogOpen(true);
  };

  const handleDeletePin = async (pin: ResearchPin) => {
    if (confirm('Are you sure you want to delete this pin?')) {
      await deletePin(pin.id);
    }
  };

  const handleOpenQA = (pin: ResearchPin) => {
    setSelectedPinForQA(pin);
    setQaDialogOpen(true);
  };

  const handleQuickQuestion = (pin: ResearchPin) => {
    const question = quickQuestion[pin.id];
    if (!question?.trim()) return;

    // Open the full QA dialog with the question pre-filled
    setInitialQuestion(question);
    setSelectedPinForQA(pin);
    setQaDialogOpen(true);
    // Clear the quick question input
    setQuickQuestion({ ...quickQuestion, [pin.id]: '' });
  };

  const handleAnalyzePin = async (pin: ResearchPin) => {
    try {
      await analyzeResearchPin(pin);
    } catch (error) {
      logger.error('Failed to analyze pin', error);
      alert('Failed to analyze pin. Please try again.');
    }
  };

  const getTypeColor = (type: ResearchPin['type']) => {
    switch (type) {
      case 'paper':
        return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'figure':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'video':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'course':
        return 'bg-green-50 text-green-700 border-green-100';
      case 'note':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  const isPrivatePin = (pin: ResearchPin) => {
    const visibility = pin.visibility || (pin.isPrivate ? 'private' : 'lab');
    return visibility === 'private';
  };

  const canEditPin = (pin: ResearchPin) => {
    return currentUser?.uid === pin.author.userId;
  };

  /**
   * Extract YouTube video ID from URL
   */
  function extractYouTubeId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : '';
  }

  if (!currentUserProfile?.labId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BrainCircuit className="h-16 w-16 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 text-lg">Please set up your profile to use the Research Board</p>
        </div>
      </div>
    );
  }

  if (loading || boardLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="h-full flex bg-slate-50/50 overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between p-6 pb-2 border-b border-slate-100 bg-white/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BrainCircuit className="text-indigo-600 h-6 w-6" />
                {board?.title || 'Research Board'}
              </h2>
              <p className="text-slate-500 text-sm">{board?.description || "Visualizing the lab's collective intelligence."}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search figures, papers, notes..."
                className="pl-9 pr-8 bg-white border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <span className="sr-only">Clear search</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                </button>
              )}
            </div>
            <Button
              variant={showChat ? "secondary" : "outline"}
              onClick={() => setShowChat(!showChat)}
              className="hidden md:flex"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleAddPin}>
              <Plus className="h-4 w-4 mr-2" /> Add Pin
            </Button>
          </div>
        </div>

        {/* Masonry Grid Content */}
        <ScrollArea className="flex-1 px-6 py-4">
          {pins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BrainCircuit className="h-16 w-16 text-slate-300 mb-4" />
              <p className="text-slate-500 text-lg">No research pins yet</p>
              <p className="text-slate-400 text-sm mt-2">Start by adding your first pin!</p>
            </div>
          ) : (
            <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 pb-20">
              {pins.map((pin) => (
                <div key={pin.id} className="break-inside-avoid mb-4">
                  <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden bg-white">

                    {/* Image Content (Figures) */}
                    {pin.type === 'figure' && pin.imageUrl && (
                      <div className="relative">
                        <img
                          src={pin.imageUrl}
                          alt={pin.title || 'Figure'}
                          className="w-full h-auto object-cover border-b border-slate-100"
                        />
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          {canEditPin(pin) && (
                            <>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-white/90 backdrop-blur"
                                onClick={() => handleEditPin(pin)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="secondary"
                                className="h-8 w-8 bg-white/90 backdrop-blur"
                                onClick={() => handleDeletePin(pin)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                        {/* Gemini 'Thinking' Overlay */}
                        {pin.isThinking && (
                          <div className="absolute inset-0 bg-indigo-900/10 backdrop-blur-[1px] flex items-center justify-center">
                            <div className="bg-white/90 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-medium text-indigo-600">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Gemini Thinking...
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Embed */}
                    {pin.type === 'video' && pin.url && (
                      <div className="relative w-full aspect-video border-b border-slate-100">
                        <iframe
                          src={pin.url.includes('youtube.com') || pin.url.includes('youtu.be')
                            ? `https://www.youtube.com/embed/${extractYouTubeId(pin.url)}`
                            : pin.url}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    <CardHeader className="p-4 pb-2 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        {pin.title && (
                          <h3 className="font-semibold text-slate-900 leading-snug flex-1">{pin.title}</h3>
                        )}
                        <div className="flex items-center gap-1">
                          {isPrivatePin(pin) && (
                            <Lock className="h-3 w-3 text-slate-400" />
                          )}
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${getTypeColor(pin.type)}`}>
                            {pin.type}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-0">
                      {/* Text Content */}
                      {pin.content && (
                        <p className={`text-slate-600 text-sm mb-3 ${pin.type === 'note' ? 'font-handwriting italic text-slate-700' : ''}`}>
                          {pin.content}
                        </p>
                      )}

                      {/* AI Analysis Block */}
                      {pin.isThinking ? (
                        <div className="mt-2 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Analyzing with Gemini...
                          </div>
                        </div>
                      ) : pin.aiAnalysis ? (
                        <div className="mt-2 p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                            <BrainCircuit className="h-3 w-3" />
                            AI Insight
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed">
                            {pin.aiAnalysis}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-2 p-2.5 bg-slate-50/50 rounded-lg border border-slate-200">
                          <p className="text-xs text-slate-500 text-center">
                            No AI analysis yet. Click &quot;Analyze with AI&quot; to generate insights.
                          </p>
                        </div>
                      )}

                      {/* Quick Question Input */}
                      <div className="mt-3 flex gap-1">
                        <Input
                          placeholder="Ask a quick question..."
                          className="text-xs h-7"
                          value={quickQuestion[pin.id] || ''}
                          onChange={(e) => setQuickQuestion({ ...quickQuestion, [pin.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuickQuestion(pin);
                              setQuickQuestion({ ...quickQuestion, [pin.id]: '' });
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleOpenQA(pin)}
                        >
                          Full Chat
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleAnalyzePin(pin)}
                          disabled={pin.isThinking}
                        >
                          {pin.isThinking ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <BrainCircuit className="h-3 w-3 mr-1" />
                              Analyze with AI
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Tags */}
                      {pin.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {pin.tags.map(tag => (
                            <button
                              key={tag}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(tag);
                              }}
                              className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded hover:bg-slate-200 hover:text-slate-700 transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pin.author.avatar} />
                          <AvatarFallback className="text-[9px] bg-slate-200">
                            {pin.author.name[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-500 font-medium">{pin.author.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Heart className="h-3.5 w-3.5 hover:text-red-500 cursor-pointer" />
                        <MessageSquare className="h-3.5 w-3.5 hover:text-indigo-600 cursor-pointer" />
                        <Share2 className="h-3.5 w-3.5 hover:text-slate-700 cursor-pointer" />
                      </div>
                    </CardFooter>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <ResearchBoardChat boardId={boardId} />
      )}

      {/* Dialogs */}
      <ResearchPinDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingPin(null);
        }}
        editingPin={editingPin}
        boardId={boardId}
      />

      <ResearchPinQADialog
        open={qaDialogOpen}
        onClose={() => {
          setQaDialogOpen(false);
          setSelectedPinForQA(null);
          setInitialQuestion('');
        }}
        pin={selectedPinForQA}
        initialQuestion={initialQuestion}
      />
    </div>
  );
}
