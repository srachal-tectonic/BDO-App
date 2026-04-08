'use client';

import React, { useState, useEffect } from 'react';
import { Folder, File, FileText, Image, FileArchive, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { auth } from '@/lib/firebase';

interface SharePointItem {
  id: string;
  name: string;
  modifiedDate: string;
  type: 'folder' | 'file';
  fileType?: string;
  path: string;
  children?: SharePointItem[];
}

interface FilesSectionProps {
  projectId: string;
}

export default function FilesSection({ projectId }: FilesSectionProps) {
  const [items, setItems] = useState<SharePointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [projectId]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current user's auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();

      // Fetch files using project ID (SharePoint folder ID is retrieved from database)
      const response = await fetch(`/api/sharepoint/files?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load files');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load files');

      // For development: Load mock data if API fails
      setItems(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const getFileIcon = (item: SharePointItem) => {
    if (item.type === 'folder') {
      return <Folder className="w-5 h-5 text-[#4a90e2]" />;
    }

    const extension = item.fileType?.toLowerCase();
    switch (extension) {
      case 'pdf':
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-[#ef4444]" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-5 h-5 text-[#10b981]" />;
      case 'zip':
      case 'rar':
        return <FileArchive className="w-5 h-5 text-[#f59e0b]" />;
      default:
        return <File className="w-5 h-5 text-[color:var(--t-color-text-secondary)]" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const renderItems = (items: SharePointItem[], depth = 0): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];

    items.forEach((item) => {
      const isExpanded = expandedFolders.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      elements.push(
        <TableRow
          key={item.id}
          className="hover:bg-[#f9fafb] cursor-pointer transition-colors"
          onClick={() => item.type === 'folder' && toggleFolder(item.id)}
        >
          <TableCell className={item.type === 'folder' ? 'font-medium' : ''}>
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 24}px` }}>
              {item.type === 'folder' && hasChildren && (
                <span className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-[color:var(--t-color-text-secondary)]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[color:var(--t-color-text-secondary)]" />
                  )}
                </span>
              )}
              {item.type === 'folder' && !hasChildren && (
                <span className="w-4 flex-shrink-0" />
              )}
              {item.type === 'file' && (
                <span className="w-4 flex-shrink-0" />
              )}
              <span className="flex-shrink-0">{getFileIcon(item)}</span>
              <span className="text-[color:var(--t-color-text-body)]">{item.name}</span>
            </div>
          </TableCell>
          <TableCell className="text-[color:var(--t-color-text-secondary)]">
            {formatDate(item.modifiedDate)}
          </TableCell>
          <TableCell className="text-[color:var(--t-color-text-secondary)]">
            {item.type === 'folder' ? 'Folder' : item.fileType?.toUpperCase() || 'File'}
          </TableCell>
        </TableRow>
      );

      // Render children if folder is expanded
      if (item.type === 'folder' && hasChildren && isExpanded) {
        elements.push(...renderItems(item.children!, depth + 1));
      }
    });

    return elements;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#4a90e2] mx-auto mb-4 animate-spin" />
          <p className="text-[color:var(--t-color-text-secondary)]">Loading files...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-[#ef4444] mb-2">Error loading files</p>
          <p className="text-[color:var(--t-color-text-secondary)] text-sm mb-4">{error}</p>
          <button
            onClick={loadFiles}
            className="px-4 py-2 bg-[#4a90e2] text-white rounded-lg hover:bg-[#357abd] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Folder className="w-12 h-12 text-[color:var(--t-color-border)] mx-auto mb-3" />
          <p className="text-[color:var(--t-color-text-secondary)]">
            Uploaded files will appear here once they have been submitted. This folder is currently empty.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[color:var(--t-color-text-body)] mb-1">Files</h2>
        <p className="text-[color:var(--t-color-text-secondary)]">Project folder structure and documents</p>
      </div>

      <div className="border border-[var(--t-color-border)] rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#f9fafb]">
              <TableHead className="font-semibold text-[color:var(--t-color-text-body)]">Name</TableHead>
              <TableHead className="font-semibold text-[color:var(--t-color-text-body)]">Modified Date</TableHead>
              <TableHead className="font-semibold text-[color:var(--t-color-text-body)]">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderItems(items)}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Mock data for development/testing
function getMockData(): SharePointItem[] {
  return [
    {
      id: '1',
      name: 'Business Documents',
      modifiedDate: '2025-01-10T14:30:00Z',
      type: 'folder',
      path: '/Business Documents',
      children: [
        {
          id: '1-1',
          name: 'Tax Returns',
          modifiedDate: '2025-01-09T10:15:00Z',
          type: 'folder',
          path: '/Business Documents/Tax Returns',
          children: [
            {
              id: '1-1-1',
              name: 'Business_Tax_Return_2024.pdf',
              modifiedDate: '2025-01-09T10:15:00Z',
              type: 'file',
              fileType: 'pdf',
              path: '/Business Documents/Tax Returns/Business_Tax_Return_2024.pdf',
            },
            {
              id: '1-1-2',
              name: 'Business_Tax_Return_2023.pdf',
              modifiedDate: '2025-01-09T10:14:00Z',
              type: 'file',
              fileType: 'pdf',
              path: '/Business Documents/Tax Returns/Business_Tax_Return_2023.pdf',
            },
          ],
        },
        {
          id: '1-2',
          name: 'Financial Statements',
          modifiedDate: '2025-01-08T16:45:00Z',
          type: 'folder',
          path: '/Business Documents/Financial Statements',
          children: [
            {
              id: '1-2-1',
              name: 'Income_Statement_Q4_2024.xlsx',
              modifiedDate: '2025-01-08T16:45:00Z',
              type: 'file',
              fileType: 'xlsx',
              path: '/Business Documents/Financial Statements/Income_Statement_Q4_2024.xlsx',
            },
            {
              id: '1-2-2',
              name: 'Balance_Sheet_2024.xlsx',
              modifiedDate: '2025-01-08T16:40:00Z',
              type: 'file',
              fileType: 'xlsx',
              path: '/Business Documents/Financial Statements/Balance_Sheet_2024.xlsx',
            },
          ],
        },
      ],
    },
    {
      id: '2',
      name: 'Personal Documents',
      modifiedDate: '2025-01-11T09:20:00Z',
      type: 'folder',
      path: '/Personal Documents',
      children: [
        {
          id: '2-1',
          name: 'Resume_John_Doe.pdf',
          modifiedDate: '2025-01-11T09:20:00Z',
          type: 'file',
          fileType: 'pdf',
          path: '/Personal Documents/Resume_John_Doe.pdf',
        },
        {
          id: '2-2',
          name: 'Personal_Tax_Return_2024.pdf',
          modifiedDate: '2025-01-11T09:15:00Z',
          type: 'file',
          fileType: 'pdf',
          path: '/Personal Documents/Personal_Tax_Return_2024.pdf',
        },
      ],
    },
    {
      id: '3',
      name: 'Project_Overview.docx',
      modifiedDate: '2025-01-12T11:30:00Z',
      type: 'file',
      fileType: 'docx',
      path: '/Project_Overview.docx',
    },
  ];
}
