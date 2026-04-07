'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { createNote, getProjectNotes, updateNote, deleteNote, getNoteTags } from '@/services/firestore';
import { Note } from '@/types';

interface NotesSectionProps {
  projectId: string;
}

// Tag color mapping - cycles through these colors based on tag index
const tagColors = [
  { bg: 'bg-blue-400', light: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-orange-400', light: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-amber-400', light: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-500', light: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-green-400', light: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-rose-400', light: 'bg-rose-100', text: 'text-rose-700' },
];

export default function NotesSection({ projectId }: NotesSectionProps) {
  const { userInfo } = useFirebaseAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isDeletingNote, setIsDeletingNote] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [notesData, tagsData] = await Promise.all([
        getProjectNotes(projectId),
        getNoteTags(),
      ]);
      setNotes(notesData);
      setAvailableTags(tagsData);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTagColor = (tag: string) => {
    const index = availableTags.indexOf(tag);
    return tagColors[index % tagColors.length];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      alert('Please enter note content');
      return;
    }

    if (!userInfo) {
      alert('You must be logged in to add notes');
      return;
    }

    try {
      setIsSaving(true);

      if (editingNote) {
        await updateNote(editingNote.id, {
          content: noteContent.trim(),
          tags: selectedTag ? [selectedTag] : [],
        });
      } else {
        await createNote({
          projectId,
          content: noteContent.trim(),
          tags: selectedTag ? [selectedTag] : [],
          createdBy: userInfo.uid,
          createdByName: userInfo.displayName || userInfo.email || 'Unknown User',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      await loadData();
      setNoteContent('');
      setSelectedTag('');
      setEditingNote(null);
      setIsAddingNote(false);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNoteContent(note.content);
    setSelectedTag(note.tags?.[0] || '');
    setIsAddingNote(true);
    // Scroll to top of notes section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteContent('');
    setSelectedTag('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this note?');
    if (!confirmDelete) return;

    try {
      setIsDeletingNote(noteId);
      await deleteNote(noteId);
      await loadData();
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to delete note. Please try again.');
    } finally {
      setIsDeletingNote(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Filter notes based on selected filter
  const filteredNotes = notes.filter((note) => {
    switch (selectedFilter) {
      case 'all':
        return true;
      case 'my-notes':
        return note.createdBy === userInfo?.uid;
      case 'pinned':
        return note.isPinned === true;
      case 'follow-ups':
        return note.isFollowUp === true;
      default:
        return true;
    }
  });

  // Fixed filter options
  const filterOptions = [
    { key: 'all', label: 'All Notes' },
    { key: 'my-notes', label: 'My Notes' },
    { key: 'pinned', label: 'Pinned' },
    { key: 'follow-ups', label: 'Follow-ups' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 -mx-6 -my-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Add Note Button (collapsed state) */}
        {!isAddingNote && (
          <button
            onClick={() => setIsAddingNote(true)}
            className="mb-6 px-6 py-2.5 bg-[#2563eb] text-white text-[15px] font-medium rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add New Note
          </button>
        )}

        {/* Add New Note Card (expanded state) */}
        {isAddingNote && (
          <div className="mb-6 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#e5e7eb] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[18px] font-semibold text-[#1a1a1a]">
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </h3>
              {availableTags.length > 0 && (
                <div className="flex gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                      className={`px-4 py-2 text-[14px] font-medium rounded-lg cursor-pointer transition-all ${
                        selectedTag === tag
                          ? 'bg-[#2563eb] text-white'
                          : 'bg-white border border-[#d1d5db] text-[#6b7280] hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Enter your notes here..."
              className="w-full min-h-[120px] p-4 text-[15px] text-[#1a1a1a] border border-[#d1d5db] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent resize-y mb-4"
              autoFocus
            />

            <div className="flex items-center justify-between">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
                  />
                  <span className="text-[14px] text-[#4b5563]">Pin this note</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-[#2563eb] border-[#d1d5db] rounded focus:ring-[#2563eb]"
                  />
                  <span className="text-[14px] text-[#4b5563]">Notify team</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="px-6 py-2 bg-white border border-[#d1d5db] text-[#6b7280] text-[14px] font-medium rounded-lg cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={isSaving}
                  className="px-6 py-2 bg-[#2563eb] text-white text-[14px] font-medium rounded-lg cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : editingNote ? 'Update Note' : 'Add Note'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Current User Selection */}
        <div className="mb-4 p-3 bg-[#f8f9fb] border border-[#e5e7eb] rounded-lg">
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#6b7280] font-medium">Current User:</span>
            <select
              className="px-3 py-1.5 text-[13px] font-medium bg-white border border-[#d1d5db] rounded-md focus:outline-none focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
            >
              <option value="User 1">User 1</option>
              <option value="User 2">User 2</option>
              <option value="User 3">User 3</option>
              <option value="Admin">Admin</option>
            </select>
            <span className="text-[12px] text-[#9ca3af] italic">(Temporary - auth to be added)</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[14px] text-[#6b7280] font-medium">Filter:</span>
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilter(f.key)}
                className={`px-4 py-1.5 text-[13px] font-medium rounded-lg cursor-pointer transition-all ${
                  selectedFilter === f.key
                    ? 'bg-[#2563eb] text-white'
                    : 'bg-[#f3f4f6] text-[#6b7280] hover:bg-[#e5e7eb]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes List */}
        <div className="space-y-4">
          {filteredNotes.map((note) => {
            const primaryTag = note.tags?.[0];
            const tagColor = primaryTag ? getTagColor(primaryTag) : tagColors[0];

            return (
              <div
                key={note.id}
                className="flex rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Colored Accent Bar */}
                <div className={`w-1 rounded-l-xl ${tagColor.bg}`} />
                <div className="flex-1 p-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {getInitials(note.createdByName)}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {note.createdByName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(note.createdAt)}
                          {note.updatedAt > note.createdAt && ' (edited)'}
                        </span>
                        {primaryTag && (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tagColor.light} ${tagColor.text}`}
                          >
                            {primaryTag}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {note.content}
                      </p>

                      {note.tags && note.tags.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
                          {note.tags.slice(1).map((tag) => (
                            <span key={tag}>#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ml-4 flex flex-col items-end gap-1 text-[11px] text-slate-500">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="hover:text-slate-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isDeletingNote === note.id}
                        className="hover:text-rose-600"
                      >
                        {isDeletingNote === note.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
              {notes.length === 0
                ? 'No notes yet. Add your first note above.'
                : 'No notes found for this filter.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
