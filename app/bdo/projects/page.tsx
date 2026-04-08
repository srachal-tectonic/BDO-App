'use client';

import { BDOLayout } from '@/components/layout/BDOLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { createProject, deleteProject, restoreProject, getUserProjects, getAllProjects, getLoanApplication, updateProject } from '@/services/firestore';
import { Project, ProjectStatus } from '@/types';
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight, Menu, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';

// Extended project type with loan application summary
interface ProjectWithSummary extends Project {
  industry?: string;
  projectTotal?: number;
  loanAmountFromApp?: number;
  sbaStructure?: string;
  primaryPurpose?: string;
}

function useResizableColumns(initialWidths: number[]) {
  const [colWidths, setColWidths] = useState<number[]>(initialWidths);
  const colCountRef = useRef(initialWidths.length);
  const dragging = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  if (initialWidths.length !== colCountRef.current) {
    colCountRef.current = initialWidths.length;
    setColWidths(initialWidths);
  }

  const onMouseDown = useCallback((colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { colIndex, startX: e.clientX, startWidth: colWidths[colIndex] };

    const onMouseMove = (ev: MouseEvent) => {
      const drag = dragging.current;
      if (!drag) return;
      const diff = ev.clientX - drag.startX;
      const newWidth = Math.max(60, drag.startWidth + diff);
      const idx = drag.colIndex;
      setColWidths(prev => {
        const next = [...prev];
        next[idx] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [colWidths]);

  return { colWidths, onMouseDown };
}

const ITEMS_PER_PAGE = 10;

// All available project statuses (no Draft)
const PROJECT_STATUSES: ProjectStatus[] = [
  'Leads',
  'PQ Prep',
  'PQ Advance',
  'PQ Reject',
  'UW',
  'Closing',
  'Withdraw | Decline',
];

const FILTER_TABS: { key: string; label: string; statuses: ProjectStatus[] }[] = [
  { key: 'All', label: 'All', statuses: [] },
  { key: 'Leads', label: 'Leads', statuses: ['Leads'] },
  { key: 'Prequal', label: 'Prequal', statuses: ['PQ Prep', 'PQ Advance', 'PQ Reject'] },
  { key: 'UW', label: 'UW', statuses: ['UW'] },
  { key: 'Closing', label: 'Closing', statuses: ['Closing'] },
  { key: 'Withdraw | Decline', label: 'Withdraw | Decline', statuses: ['Withdraw | Decline'] },
  { key: 'Archive', label: 'Archive', statuses: [] },
];

const getStatusColor = (stage: string) => {
  switch (stage) {
    case 'Leads':
      return 'bg-[#d0dbe9] text-[#133c7f] border-[#b8c8de]';
    case 'PQ Prep':
      return 'bg-[#a1b3d2] text-[#133c7f] border-[#8ba1c5]';
    case 'PQ Advance':
      return 'bg-[#718bbc] text-white border-[#5d7aaf]';
    case 'PQ Reject':
      return 'bg-[#e7edf4] text-[#133c7f] border-[#c5d4e8]';
    case 'UW':
      return 'bg-[#4362a5] text-white border-[#365294]';
    case 'Closing':
      return 'bg-[#133c7f] text-white border-[#0e2d61]';
    case 'Withdraw | Decline':
      return 'bg-[#e7edf4] text-[#133c7f] border-[#c5d4e8]';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function ProjectsPage() {
  const { userInfo } = useFirebaseAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'my-pipeline' | 'all-projects'>('my-pipeline');
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusChangeProject, setStatusChangeProject] = useState<{ id: string; currentStatus: ProjectStatus } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  const { colWidths, onMouseDown } = useResizableColumns([240, 140, 160, 180, 140, 60]);

  const openActionMenu = (projectId: string, buttonEl: HTMLElement) => {
    const rect = buttonEl.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 4, left: rect.right - 160 });
    setOpenMenuId(projectId);
  };

  const closeMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) {
        setMobileFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (userInfo?.uid) {
      loadProjects();
    }
  }, [userInfo, viewMode]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      if (userInfo?.uid) {
        const isAdmin = userInfo.role === 'Admin';
        const projectsData = viewMode === 'my-pipeline'
          ? await getUserProjects(userInfo.uid, { includeDeleted: isAdmin })
          : await getAllProjects({ includeDeleted: isAdmin });

        const projectsWithSummary: ProjectWithSummary[] = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const loanApp = await getLoanApplication(project.id);
              const loanType = loanApp?.loan1?.type || loanApp?.loan2?.type || '';
              let sbaStructure = '';
              if (loanType.includes('7a') || loanType.includes('7(a)')) sbaStructure = '7(a)';
              else if (loanType.includes('504')) sbaStructure = '504';
              else if (loanType.includes('USDA') || loanType.includes('usda')) sbaStructure = 'USDA B&I';
              else if (loanType) sbaStructure = loanType;

              const rawPurpose = loanApp?.projectOverview?.primaryProjectPurpose || '';
              const primaryPurpose = Array.isArray(rawPurpose) ? rawPurpose.join(', ') : rawPurpose;

              return {
                ...project,
                industry: loanApp?.projectOverview?.industry || project.businessType,
                projectTotal: loanApp?.sourcesUses?.totalUses,
                loanAmountFromApp: loanApp?.sourcesUses?.loanAmount,
                sbaStructure,
                primaryPurpose,
              };
            } catch {
              return { ...project, industry: project.businessType };
            }
          })
        );

        setProjects(projectsWithSummary);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !userInfo) return;

    try {
      setIsCreating(true);

      const projectData = {
        projectName: newProjectName.trim(),
        businessName: newProjectName.trim(),
        stage: 'Leads' as const,
        status: 'Active' as const,
        bdoUserId: userInfo.uid,
        bdoUserName: userInfo.displayName || userInfo.email || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await createProject(projectData);
      await loadProjects();

      setIsModalOpen(false);
      setNewProjectName('');
    } catch (error) {
      console.error('Error creating project:', error);
      alert('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await deleteProject(deleteTarget.id, userInfo?.uid);
      await loadProjects();
      closeMenu();
      setDeleteTarget(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreProject = async (projectId: string) => {
    try {
      await restoreProject(projectId);
      await loadProjects();
    } catch (error) {
      console.error('Error restoring project:', error);
      alert('Failed to restore project. Please try again.');
    }
  };

  const handleStatusChange = async (projectId: string, newStatus: ProjectStatus) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const oldStatus = project.stage;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, stage: newStatus } : p))
    );
    try {
      await updateProject(projectId, { stage: newStatus });
    } catch (error) {
      console.error('Error updating project status:', error);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, stage: oldStatus } : p))
      );
      alert('Failed to update status. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter projects
  const filteredProjects = useMemo(() => {
    let filtered = projects;

    if (activeFilter === 'Archive') {
      filtered = filtered.filter(p => !!p.deletedAt);
    } else {
      filtered = filtered.filter(p => !p.deletedAt);
      const tab = FILTER_TABS.find(t => t.key === activeFilter);
      if (tab && tab.statuses.length > 0) {
        filtered = filtered.filter(p => tab.statuses.includes(p.stage));
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project => {
        const name = project.projectName?.toLowerCase() || '';
        const clientName = project.businessName?.toLowerCase() || '';
        const industry = project.industry?.toLowerCase() || '';
        const bdoName = project.bdoUserName?.toLowerCase() || '';
        return name.includes(query) || clientName.includes(query) || industry.includes(query) || bdoName.includes(query);
      });
    }

    return filtered;
  }, [projects, searchQuery, activeFilter]);

  // Sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const sortedProjects = useMemo(() => {
    if (!sortColumn) return filteredProjects;
    return [...filteredProjects].sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';
      switch (sortColumn) {
        case 'name':
          valA = (a.projectName || '').toLowerCase();
          valB = (b.projectName || '').toLowerCase();
          break;
        case 'loanAmount':
          valA = a.loanAmountFromApp || a.loanAmount || 0;
          valB = b.loanAmountFromApp || b.loanAmount || 0;
          break;
        case 'structure':
          valA = (a.sbaStructure || '').toLowerCase();
          valB = (b.sbaStructure || '').toLowerCase();
          break;
        case 'primaryPurpose':
          valA = (a.primaryPurpose || '').toLowerCase();
          valB = (b.primaryPurpose || '').toLowerCase();
          break;
        case 'status':
          valA = (a.stage || '').toLowerCase();
          valB = (b.stage || '').toLowerCase();
          break;
        default:
          return 0;
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = sortedProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Counts for filter tabs
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const active = projects.filter(p => !p.deletedAt);
    const archived = projects.filter(p => !!p.deletedAt);

    FILTER_TABS.forEach(tab => {
      if (tab.key === 'All') {
        counts[tab.key] = active.length;
      } else if (tab.key === 'Archive') {
        counts[tab.key] = archived.length;
      } else {
        counts[tab.key] = active.filter(p => tab.statuses.includes(p.stage)).length;
      }
    });
    return counts;
  }, [projects]);

  return (
    <BDOLayout title="My Pipeline">
      <div className="space-y-6">
        {/* Toggle + New Project */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="flex bg-white border border-[var(--t-color-border)] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('my-pipeline')}
                className={`px-4 py-1.5 text-[length:var(--t-font-size-base)] font-medium rounded-md transition-colors ${
                  viewMode === 'my-pipeline'
                    ? 'bg-[var(--t-color-primary)] text-white'
                    : 'bg-white text-[color:var(--t-color-text-secondary)]'
                }`}
              >
                My Pipeline
              </button>
              <button
                onClick={() => setViewMode('all-projects')}
                className={`px-4 py-1.5 text-[length:var(--t-font-size-base)] font-medium rounded-md transition-colors ${
                  viewMode === 'all-projects'
                    ? 'bg-[var(--t-color-primary)] text-white'
                    : 'bg-white text-[color:var(--t-color-text-secondary)]'
                }`}
              >
                All Projects
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-1.5 bg-[var(--t-color-primary)] text-white text-[length:var(--t-font-size-base)] font-medium rounded-lg cursor-pointer transition-all hover-elevate active-elevate-2 flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Search + Filter Tabs + Table */}
        <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-xl">
          {/* Desktop: Filter Tabs + Search inline */}
          <div className="hidden md:flex items-center px-5 pt-3 gap-3">
            {FILTER_TABS.map(tab => {
              const count = filterCounts[tab.key] || 0;
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-4 py-2.5 text-[length:var(--t-font-size-sm)] font-medium uppercase tracking-wider transition-colors flex items-center gap-2 whitespace-nowrap border-b-2 -mb-px ${
                    isActive
                      ? 'text-[color:var(--t-color-primary)] font-semibold border-[var(--t-color-primary)] bg-[var(--t-color-primary-palest)]'
                      : 'text-[color:var(--t-color-primary-lighter)] border-transparent'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[length:var(--t-font-size-sm)] font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-[var(--t-color-primary)] text-white'
                      : 'bg-[var(--t-color-primary-palest)] text-[color:var(--t-color-primary-lighter)]'
                  }`}>{count}</span>
                </button>
              );
            })}
            <div className="relative ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--t-color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, clients..."
                className="pl-9 pr-4 py-1.5 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-sm)] w-[240px] focus:border-[var(--t-color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)]"
              />
            </div>
          </div>

          {/* Mobile: Hamburger filter dropdown + Search */}
          <div className="md:hidden px-4 pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0" ref={mobileFilterRef}>
                <button
                  onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-primary)]"
                >
                  <Menu className="w-4 h-4" />
                  {FILTER_TABS.find(t => t.key === activeFilter)?.label || 'All'}
                  <span className="bg-[var(--t-color-primary)] text-white text-[length:var(--t-font-size-sm)] font-semibold px-1.5 py-0.5 rounded">
                    {filterCounts[activeFilter] || 0}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                {mobileFilterOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg shadow-lg z-30 py-1">
                    {FILTER_TABS.map(tab => {
                      const count = filterCounts[tab.key] || 0;
                      const isActive = activeFilter === tab.key;
                      return (
                        <button
                          key={tab.key}
                          onClick={() => { setActiveFilter(tab.key); setMobileFilterOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-[length:var(--t-font-size-base)] flex items-center justify-between ${
                            isActive
                              ? 'bg-[var(--t-color-primary-palest)] text-[color:var(--t-color-primary)] font-semibold'
                              : 'text-[color:var(--t-color-text-body)]'
                          }`}
                        >
                          {tab.label}
                          <span className={`text-[length:var(--t-font-size-sm)] font-semibold px-1.5 py-0.5 rounded ${
                            isActive
                              ? 'bg-[var(--t-color-primary)] text-white'
                              : 'bg-[var(--t-color-primary-palest)] text-[color:var(--t-color-primary-lighter)]'
                          }`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--t-color-text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 border border-[var(--t-color-border)] rounded-lg text-[length:var(--t-font-size-base)] w-full focus:border-[var(--t-color-primary)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(19,60,127,0.1)]"
                />
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="mt-2 pt-3">
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-primary)] border-t-transparent rounded-full"></div>
              <p className="text-[color:var(--t-color-text-secondary)] mt-4">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-8 md:p-16 text-center">
              <h3 className="text-lg font-semibold text-[color:var(--t-color-primary)] mb-2">
                {searchQuery ? 'No projects match your search' : activeFilter !== 'All' ? 'No projects with this status' : 'No projects yet'}
              </h3>
              <p className="text-[color:var(--t-color-text-secondary)] mb-6 text-[length:var(--t-font-size-base)]">
                {searchQuery ? 'Try a different search term' : 'Get started by creating your first project'}
              </p>
              {!searchQuery && activeFilter === 'All' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 bg-[var(--t-color-primary)] text-white text-[length:var(--t-font-size-base)] font-medium rounded-lg cursor-pointer transition-all hover-elevate active-elevate-2 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto px-5">
                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    {colWidths.map((w, i) => (
                      <col key={i} style={{ width: `${w}px` }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr className="border-t border-b border-[var(--t-color-border)]">
                      {(() => {
                        const headers = [
                          { label: 'Project Name', align: 'text-left', sortKey: 'name' },
                          { label: 'Loan Amount', align: 'text-right', sortKey: 'loanAmount' },
                          { label: 'SBA Structure', align: 'text-left', sortKey: 'structure' },
                          { label: 'Primary Purpose', align: 'text-left', sortKey: 'primaryPurpose' },
                          { label: 'Status', align: 'text-left', sortKey: 'status' },
                          { label: 'Actions', align: 'text-right', sortKey: null as string | null },
                        ];
                        return headers.map((h, i) => (
                          <th
                            key={i}
                            className={`px-3 py-2 ${h.align} text-[length:var(--t-font-size-sm)] font-semibold text-[color:var(--t-color-text-secondary)] uppercase tracking-wider relative ${h.sortKey ? 'cursor-pointer select-none hover:text-[color:var(--t-color-primary)]' : ''}`}
                            onClick={h.sortKey ? () => handleSort(h.sortKey!) : undefined}
                          >
                            <span className={`inline-flex items-center gap-1 ${h.align === 'text-right' ? 'justify-end' : ''}`}>
                              {h.label}
                              {h.sortKey && (
                                sortColumn === h.sortKey ? (
                                  sortDirection === 'asc'
                                    ? <ArrowUp className="w-3 h-3" />
                                    : <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 opacity-30" />
                                )
                              )}
                            </span>
                            {i < headers.length - 1 && (
                              <div
                                onMouseDown={(e) => { e.stopPropagation(); onMouseDown(i, e); }}
                                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--t-color-primary-pale)] transition-colors"
                              />
                            )}
                          </th>
                        ));
                      })()}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--t-color-primary-palest)]">
                    {paginatedProjects.map((project) => {
                      const loanAmount = project.loanAmountFromApp || project.loanAmount || 0;
                      const clientName = project.businessName || '';
                      const isDeleted = !!project.deletedAt;

                      return (
                        <tr
                          key={project.id}
                          className={`transition-colors cursor-pointer ${isDeleted ? 'bg-red-50/50 opacity-60' : 'hover:bg-[var(--t-color-page-bg)]'}`}
                          onClick={() => !isDeleted && (router.push(`/bdo/projects/${project.id}`))}
                        >
                          <td className="px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)] leading-tight">
                              {project.projectName}
                            </span>
                            {clientName && clientName !== project.projectName && (
                              <div className="text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-muted)]">{clientName}</div>
                            )}
                            {isDeleted && (
                              <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                Deleted
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-[length:var(--t-font-size-base)] font-medium text-[color:var(--t-color-primary)] overflow-hidden text-ellipsis whitespace-nowrap">
                            {loanAmount > 0 ? formatCurrency(loanAmount) : '—'}
                          </td>
                          <td className="px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)]">
                              {project.sbaStructure || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-left text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-body)] overflow-hidden text-ellipsis whitespace-nowrap">
                            {project.primaryPurpose || '—'}
                          </td>
                          <td className="px-3 py-2 text-left">
                            <span className={`inline-block min-w-[9.5rem] text-center px-2 py-1 rounded-md text-[length:var(--t-font-size-base)] font-medium border ${getStatusColor(project.stage)}`}>
                              {project.stage}
                            </span>
                          </td>
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1.5 justify-end items-center">
                              {isDeleted ? (
                                <button
                                  onClick={() => handleRestoreProject(project.id)}
                                  className="px-3 py-1 bg-[var(--t-color-success)] text-white text-[length:var(--t-font-size-sm)] font-medium rounded-md cursor-pointer transition-all hover-elevate"
                                >
                                  Restore
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openMenuId === project.id) {
                                      closeMenu();
                                    } else {
                                      openActionMenu(project.id, e.currentTarget);
                                    }
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--t-color-border)] text-[color:var(--t-color-text-secondary)] hover:bg-[var(--t-color-primary-palest)] transition-colors"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden px-4 space-y-3">
                {paginatedProjects.map((project) => {
                  const loanAmount = project.loanAmountFromApp || project.loanAmount || 0;
                  const isDeleted = !!project.deletedAt;

                  return (
                    <div
                      key={project.id}
                      className="border border-[var(--t-color-border)] rounded-lg p-4 bg-[var(--t-color-page-bg)] cursor-pointer hover-elevate active-elevate-2 transition-colors"
                      onClick={() => !isDeleted && (router.push(`/bdo/projects/${project.id}`))}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[length:var(--t-font-size-base)] font-semibold text-[color:var(--t-color-primary)] leading-tight">
                          {project.projectName}
                        </span>
                        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openMenuId === project.id) closeMenu();
                              else openActionMenu(project.id, e.currentTarget);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-md border border-[var(--t-color-border)] text-[color:var(--t-color-text-secondary)] hover:bg-[var(--t-color-primary-palest)] transition-colors"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mb-2">
                        <span className={`inline-block min-w-[9.5rem] text-center px-2 py-0.5 rounded-md text-[length:var(--t-font-size-sm)] font-medium border ${getStatusColor(project.stage)}`}>
                          {project.stage}
                        </span>
                      </div>
                      {project.sbaStructure && (
                        <div className="mb-1 text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-body)]">
                          {project.sbaStructure}
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-[length:var(--t-font-size-sm)]">
                        <div className="flex items-center gap-3 flex-wrap">
                          {loanAmount > 0 && (
                            <span className="text-[color:var(--t-color-text-secondary)]">
                              Loan: <span className="font-medium text-[color:var(--t-color-primary)]">{formatCurrency(loanAmount)}</span>
                            </span>
                          )}
                          {project.primaryPurpose && (
                            <span className="text-[color:var(--t-color-text-secondary)]">
                              Purpose: <span className="font-medium text-[color:var(--t-color-text-body)]">{project.primaryPurpose}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 md:px-5 py-2 border-t border-[var(--t-color-border)] mt-3">
                <p className="text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-muted)]">
                  {filteredProjects.length} of {projects.filter(p => !p.deletedAt).length} projects
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] disabled:text-[color:var(--t-color-border)] flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-md text-[length:var(--t-font-size-base)] font-medium flex items-center justify-center ${
                        page === currentPage
                          ? 'bg-[var(--t-color-primary-pale)] text-white'
                          : 'text-[color:var(--t-color-text-secondary)] hover:bg-[var(--t-color-primary-palest)]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] disabled:text-[color:var(--t-color-border)] flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
          </div>
        </div>
      </div>

      {/* Floating Action Menu */}
      {openMenuId && menuPosition && (() => {
        const menuProject = projects.find(p => p.id === openMenuId);
        if (!menuProject) return null;
        return (
          <>
            <div className="fixed inset-0 z-[60]" onClick={closeMenu} />
            <div
              className="fixed w-40 bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-lg shadow-lg z-[61] py-1"
              style={{ top: menuPosition.top, left: menuPosition.left }}
            >
              <Link
                href={`/bdo/projects/${menuProject.id}`}
                onClick={closeMenu}
                className="w-full text-left px-3 py-1.5 text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-body)] hover:bg-[var(--t-color-page-bg)] transition-colors block"
              >
                Open
              </Link>
              <button
                onClick={() => { setStatusChangeProject({ id: menuProject.id, currentStatus: menuProject.stage }); closeMenu(); }}
                className="w-full text-left px-3 py-1.5 text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-text-body)] hover:bg-[var(--t-color-page-bg)] transition-colors"
              >
                Change Status
              </button>
              <button
                onClick={() => { setDeleteTarget({ id: menuProject.id, name: menuProject.projectName }); closeMenu(); }}
                className="w-full text-left px-3 py-1.5 text-[length:var(--t-font-size-sm)] text-[color:var(--t-color-danger)] hover:bg-[var(--t-color-danger-bg)] transition-colors"
              >
                Delete
              </button>
            </div>
          </>
        );
      })()}

      {/* Change Status Modal */}
      {statusChangeProject && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setStatusChangeProject(null)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs border border-[var(--t-color-border)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-[var(--t-color-border)]">
              <h3 className="text-[length:var(--t-font-size-lg)] font-semibold text-[color:var(--t-color-text-body)]">Change Status</h3>
            </div>
            <div className="py-1">
              {PROJECT_STATUSES.map(option => {
                const isActive = statusChangeProject.currentStatus === option;
                const colorClass = getStatusColor(option);
                return (
                  <button
                    key={option}
                    onClick={() => {
                      handleStatusChange(statusChangeProject.id, option);
                      setStatusChangeProject(null);
                    }}
                    className={`w-full text-left px-4 py-2 text-[length:var(--t-font-size-base)] transition-colors flex items-center gap-2 ${
                      isActive ? 'bg-[var(--t-color-highlight-bg)] font-medium' : 'hover:bg-[var(--t-color-page-bg)]'
                    }`}
                  >
                    <span className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${colorClass}`} />
                    <span className="text-[color:var(--t-color-text-body)]">{option}</span>
                    {isActive && <span className="ml-auto text-[color:var(--t-color-accent)] text-[length:var(--t-font-size-sm)]">Current</span>}
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-[var(--t-color-border)]">
              <button
                onClick={() => setStatusChangeProject(null)}
                className="w-full px-3 py-1.5 text-[length:var(--t-font-size-base)] text-[color:var(--t-color-text-secondary)] border border-[var(--t-color-border)] rounded-md hover:bg-[var(--t-color-page-bg)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Project Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Enter a name for your new SBA loan application project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="e.g., ABC Restaurant Acquisition"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isCreating) handleCreateProject();
                }}
                disabled={isCreating}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsModalOpen(false); setNewProjectName(''); }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteTarget?.name}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BDOLayout>
  );
}
