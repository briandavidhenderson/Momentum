import React, { useState } from 'react';
import {
    Plus,
    Search,
    BrainCircuit,
    Users,
    MessageSquare,
    Clock,
    Lock,
    Globe,
    Eye
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useResearchBoards } from '@/lib/hooks/useResearchBoards';
import { CreateBoardDialog } from './CreateBoardDialog';
import { formatDistanceToNow } from 'date-fns';
import { ResearchBoard } from '@/lib/types';
import { filterBoards } from '@/lib/utils/boardFilters';

interface ResearchBoardsListProps {
    onSelectBoard: (boardId: string) => void;
}

export function ResearchBoardsList({ onSelectBoard }: ResearchBoardsListProps) {
    const { boards, loading } = useResearchBoards();
    const [searchQuery, setSearchQuery] = useState('');
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const filteredBoards = filterBoards(boards, searchQuery);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BrainCircuit className="text-indigo-600 h-6 w-6" />
                        Research Boards
                    </h2>
                    <p className="text-slate-500 text-sm">Collaborative spaces for your research topics.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search boards..."
                            className="pl-9 bg-white border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button className="bg-slate-900 hover:bg-slate-800" onClick={() => setCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> New Board
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <ScrollArea className="flex-1 px-6 py-4">
                {filteredBoards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <BrainCircuit className="h-16 w-16 text-slate-300 mb-4" />
                        <p className="text-slate-500 text-lg">No research boards found</p>
                        <p className="text-slate-400 text-sm mt-2">Create a new board to start collaborating!</p>
                        <Button variant="outline" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                            Create Board
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                        {filteredBoards.map((board) => (
                            <BoardCard key={board.id} board={board} onClick={() => onSelectBoard(board.id)} />
                        ))}
                    </div>
                )}
            </ScrollArea>

            <CreateBoardDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            />
        </div>
    );
}

function BoardCard({ board, onClick }: { board: ResearchBoard; onClick: () => void }) {
    return (
        <Card
            className="cursor-pointer hover:shadow-md transition-all border-slate-200 group bg-white"
            onClick={onClick}
        >
            <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {board.title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-xs h-8">
                    {board.description || "No description"}
                </CardDescription>
                <div className="flex gap-2 mt-2">
                    {board.visibility === 'private' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-slate-100 text-slate-600 border-slate-200">
                            <Lock className="h-3 w-3 mr-1" /> Private
                        </Badge>
                    )}
                    {board.visibility === 'lab' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-indigo-50 text-indigo-600 border-indigo-100">
                            <Users className="h-3 w-3 mr-1" /> Lab
                        </Badge>
                    )}
                    {board.visibility === 'public' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-green-50 text-green-600 border-green-100">
                            <Globe className="h-3 w-3 mr-1" /> Public
                        </Badge>
                    )}
                    {board.visibility === 'shared' && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 bg-amber-50 text-amber-600 border-amber-100">
                            <Eye className="h-3 w-3 mr-1" /> Shared
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {board.members?.length || 0} members
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {board.updatedAt && !isNaN(new Date(board.updatedAt).getTime()) ? formatDistanceToNow(board.updatedAt, { addSuffix: true }) : 'Just now'}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between items-center">
                <div className="flex -space-x-2">
                    {/* We would ideally fetch member avatars here, but for now just show placeholders or count */}
                    {(board.members || []).slice(0, 3).map((memberId, i) => (
                        <Avatar key={memberId} className="h-6 w-6 border-2 border-white">
                            <AvatarFallback className="text-[9px] bg-slate-200">
                                U
                            </AvatarFallback>
                        </Avatar>
                    ))}
                    {(board.members?.length || 0) > 3 && (
                        <div className="h-6 w-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] text-slate-500 font-medium">
                            +{(board.members?.length || 0) - 3}
                        </div>
                    )}
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-auto">
                    View Board <BrainCircuit className="h-3 w-3 ml-1" />
                </Button>
            </CardFooter>
        </Card>
    );
}
