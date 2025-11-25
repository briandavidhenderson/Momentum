"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, FileText, Image as ImageIcon, Video, BookOpen, StickyNote, X } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useResearchBoard } from '@/lib/hooks/useResearchBoard';
import { uploadResearchImage, uploadResearchPDF } from '@/lib/storage';
import { analyzeScientificContent, generateSummary } from '@/lib/ai/geminiAgent';
import { updateResearchPin } from '@/lib/services/researchService';
import type { ResearchPin, ResearchPinType, CreateResearchPinInput, UpdateResearchPinInput } from '@/lib/types';
import { logger } from '@/lib/logger';

interface ResearchPinDialogProps {
  open: boolean;
  onClose: () => void;
  editingPin?: ResearchPin | null;
  boardId?: string;
}

export function ResearchPinDialog({ open, onClose, editingPin, boardId }: ResearchPinDialogProps) {
  const { currentUser, currentUserProfile } = useAuth();
  const { createPin, updatePin } = useResearchBoard(boardId);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const [type, setType] = useState<ResearchPinType>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form when dialog opens or editingPin changes
  useEffect(() => {
    if (open) {
      if (editingPin) {
        setType(editingPin.type);
        setTitle(editingPin.title || '');
        setContent(editingPin.content || '');
        setUrl(editingPin.url || '');
        setTags(editingPin.tags.join(', '));
        const pinVisibility = editingPin.visibility || (editingPin.isPrivate ? 'private' : 'lab');
        setIsPrivate(pinVisibility === 'private');
        setFilePreview(editingPin.imageUrl || editingPin.fileUrl || null);
        setSelectedFile(null);
      } else {
        // Reset form for new pin
        setType('note');
        setTitle('');
        setContent('');
        setUrl('');
        setTags('');
        setIsPrivate(false);
        setSelectedFile(null);
        setFilePreview(null);
      }
      setLoading(false);
      setAnalyzing(false);
    }
  }, [open, editingPin]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractPDFText = async (file: File): Promise<string> => {
    try {
      // Dynamically import pdfjs-dist to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Configure worker to use locally hosted file
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      return fullText;
    } catch (error) {
      logger.error('Error extracting PDF text', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const handleSubmit = async () => {
    if (!currentUserProfile?.labId || !currentUser?.uid) {
      alert('You must be logged in to create a pin');
      return;
    }

    setLoading(true);
    setAnalyzing(true);

    try {
      let imageUrl: string | undefined;
      let fileUrl: string | undefined;
      let storagePath: string | undefined;
      let pdfText: string | undefined;

      // For new pins, create first to get pinId, then upload files
      // For existing pins, upload files if new file selected
      let pinId: string;

      if (editingPin) {
        pinId = editingPin.id;
      } else {
        // Create pin first with temporary data (will update with file URLs after upload)
        const initialPinData: CreateResearchPinInput = {
          type,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          url: url.trim() || undefined,
          author: {
            userId: currentUser.uid,
            name: `${currentUserProfile.firstName} ${currentUserProfile.lastName}`.trim(),
            avatar: currentUserProfile.avatarUrl,
          },
          labId: currentUserProfile.labId,
          boardId, // Add boardId here
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          isPrivate,
          visibility: isPrivate ? 'private' : 'lab',
        };

        pinId = await createPin(initialPinData) || '';
        if (!pinId) {
          throw new Error('Failed to create pin');
        }
      }

      // Handle file upload (now we have pinId)
      if (selectedFile) {
        if (type === 'figure' && selectedFile.type.startsWith('image/')) {
          // Upload image
          const result = await uploadResearchImage(selectedFile, currentUserProfile.labId, pinId);
          imageUrl = result.url;
          storagePath = result.storagePath;
        } else if (type === 'paper' && selectedFile.type === 'application/pdf') {
          // Upload PDF and extract text
          const result = await uploadResearchPDF(selectedFile, currentUserProfile.labId, pinId);
          fileUrl = result.url;
          storagePath = result.storagePath;

          // Extract PDF text
          pdfText = await extractPDFText(selectedFile);
        }
      }

      // Prepare pin update data
      const pinUpdateData: UpdateResearchPinInput = {
        type,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        url: url.trim() || undefined,
        imageUrl,
        fileUrl,
        storagePath,
        pdfText,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        isPrivate,
        visibility: isPrivate ? 'private' : 'lab',
      };

      if (editingPin) {
        // Update existing pin
        await updatePin(editingPin.id, pinUpdateData);
      } else {
        // Update newly created pin with file URLs
        await updatePin(pinId, pinUpdateData);
      }

      // Trigger AI analysis
      try {
        let analysis: string | undefined;
        let summary: string | undefined;

        if (type === 'figure' && (selectedFile || editingPin?.imageUrl)) {
          // Analyze image
          const imageFile = selectedFile || (editingPin?.imageUrl ? await fetch(editingPin.imageUrl).then(r => r.blob()).then(b => new File([b], 'image.jpg')) : null);
          if (imageFile) {
            analysis = await analyzeScientificContent({
              content: imageFile,
              contentType: 'image',
              context: title || content,
            });
            summary = await generateSummary(analysis, 'text');
          }
        } else if (type === 'paper' && pdfText) {
          // Analyze PDF
          analysis = await analyzeScientificContent({
            content: pdfText,
            contentType: 'pdf',
            context: title,
          });
          summary = await generateSummary(analysis, 'pdf');
        } else if (type === 'video' && url) {
          // Analyze YouTube video (metadata)
          analysis = await analyzeScientificContent({
            content: `YouTube video: ${url}\n${title ? `Title: ${title}` : ''}\n${content || ''}`,
            contentType: 'text',
            context: 'YouTube video analysis',
          });
          summary = await generateSummary(analysis, 'text');
        } else if (content) {
          // Analyze text content
          analysis = await analyzeScientificContent({
            content,
            contentType: 'text',
            context: title,
          });
          summary = await generateSummary(analysis, 'text');
        }

        // Update pin with AI analysis
        if (analysis || summary) {
          await updateResearchPin(pinId, {
            aiAnalysis: analysis,
            aiSummary: summary,
            isThinking: false,
          });
        }
      } catch (error) {
        logger.error('Error during AI analysis', error);
        // Don't fail the whole operation if AI analysis fails
      }

      setAnalyzing(false);
      setLoading(false);
      onClose();
    } catch (error) {
      logger.error('Error creating/updating research pin', error);
      alert('Failed to save pin. Please try again.');
      setAnalyzing(false);
      setLoading(false);
    }
  };

  const requiresFile = type === 'figure' || type === 'paper';
  const requiresUrl = type === 'video';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPin ? 'Edit Research Pin' : 'Add Research Pin'}</DialogTitle>
          <DialogDescription>
            Share papers, figures, videos, courses, or notes with your lab
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(value) => setType(value as ResearchPinType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Paper
                  </div>
                </SelectItem>
                <SelectItem value="figure">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Figure
                  </div>
                </SelectItem>
                <SelectItem value="video">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Video
                  </div>
                </SelectItem>
                <SelectItem value="course">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Course
                  </div>
                </SelectItem>
                <SelectItem value="note">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
            />
          </div>

          {/* URL (for videos) */}
          {requiresUrl && (
            <div className="space-y-2">
              <Label>YouTube URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          )}

          {/* File Upload */}
          {requiresFile && (
            <div className="space-y-2">
              <Label>
                {type === 'figure' ? 'Image' : 'PDF File'}
              </Label>
              {!selectedFile && !filePreview && (
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={type === 'figure' ? 'image/*' : 'application/pdf'}
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">
                      Click to upload {type === 'figure' ? 'an image' : 'a PDF'}
                    </p>
                  </label>
                </div>
              )}
              {(selectedFile || filePreview) && (
                <div className="relative">
                  {filePreview && (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain border rounded-lg"
                    />
                  )}
                  {selectedFile && !filePreview && (
                    <div className="border rounded-lg p-4 flex items-center gap-2">
                      <FileText className="h-8 w-8 text-slate-400" />
                      <span className="flex-1 text-sm">{selectedFile.name}</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <Label>Description / Notes</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Add a description, notes, or context..."
              rows={4}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., FACS, Validation, Aim 1"
            />
          </div>

          {/* Privacy Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private"
              checked={isPrivate}
              onCheckedChange={(checked) => setIsPrivate(checked === true)}
            />
            <Label htmlFor="private" className="cursor-pointer">
              Make this pin private (only visible to me)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (requiresFile && !selectedFile && !filePreview) || (requiresUrl && !url)}
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingPin ? 'Update Pin' : 'Create Pin'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
