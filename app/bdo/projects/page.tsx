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
import { Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { authenticatedPost } from '@/lib/authenticatedFetch';
import Link from 'next/link';
import { useEffect, useState, useMemo, useRef } from 'react';

// Extended project type with loan application summary
interface ProjectWithSummary extends Project {
  industry?: string;
  projectTotal?: number;
  loanAmountFromApp?: number;
}

const ITEMS_PER_PAGE = 10;

// All available project statuses (no Draft)
const PROJECT_STATUSES: ProjectStatus[] = [
  'Watch List',
  'Warmer Leads',
  'Active Lead',
  'PQ Advance',
  'PQ More Info',
  'UW',
  'Closing',
  'Adverse Action',
  'Withdrawn',
];

const FILTER_TABS = [
  { key: 'All', label: 'All' },
  ...PROJECT_STATUSES.map(s => ({ key: s, label: s })),
];

function getBDOInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return '';
}

function getPriorityFromRisk(riskLevel: string): { label: string; color: string } {
  switch (riskLevel) {
    case 'low':
      return { label: 'Low', color: 'text-[#059669] bg-[#ecfdf5]' };
    case 'low-medium':
    case 'medium':
      return { label: 'Med', color: 'text-[#d97706] bg-[#fef3c7]' };
    case 'medium-high':
    case 'high':
      return { label: 'High', color: 'text-[#dc2626] bg-[#fee2e2]' };
    case 'very-high':
      return { label: 'Very High', color: 'text-[#dc2626] bg-[#fee2e2]' };
    default:
      return { label: '', color: '' };
  }
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    const m = amount / 1_000_000;
    return `$${m.toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    const k = amount / 1_000;
    return `$${k.toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

const getStatusColor = (stage: string) => {
  switch (stage) {
    case 'Draft':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    case 'Watch List':
    case 'Warmer Leads':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Active Lead':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'PQ Advance':
    case 'PQ More Info':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'UW':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'Closing':
      return 'bg-teal-100 text-teal-800 border-teal-300';
    case 'Adverse Action':
    case 'Withdrawn':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function ProjectsPage() {
  const { userInfo } = useFirebaseAuth();
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
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

        // Fetch loan application data for each project to get summary info
        const projectsWithSummary: ProjectWithSummary[] = await Promise.all(
          projectsData.map(async (project) => {
            try {
              const loanApp = await getLoanApplication(project.id);
              return {
                ...project,
                industry: loanApp?.projectOverview?.industry || project.businessType,
                projectTotal: loanApp?.sourcesUses?.totalUses,
                loanAmountFromApp: loanApp?.sourcesUses?.loanAmount,
              };
            } catch {
              return {
                ...project,
                industry: project.businessType,
              };
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

      // Step 1: Create SharePoint folder
      let sharepointFolderId: string | undefined;
      let sharepointFolderUrl: string | undefined;
      try {
        const folderResponse = await authenticatedPost('/api/sharepoint/create-folder', {
          projectName: newProjectName.trim(),
        });

        const folderData = await folderResponse.json();

        if (folderResponse.ok && folderData.folderId) {
          sharepointFolderId = folderData.folderId;
          sharepointFolderUrl = folderData.folderUrl;
        }
      } catch (folderError) {
        console.error('[SharePoint] Exception during folder creation:', folderError);
      }

      // Step 2: Create project in database with SharePoint folder ID
      const projectData = {
        projectName: newProjectName.trim(),
        businessName: newProjectName.trim(),
        stage: 'Active Lead' as const,
        status: 'Active' as const,
        bdoUserId: userInfo.uid,
        bdoUserName: userInfo.displayName || userInfo.email || 'Unknown',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(sharepointFolderId && { sharepointFolderId }),
        ...(sharepointFolderUrl && { sharepointFolderUrl }),
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
      setOpenMenuId(null);
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

    // Optimistic update
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

  const formatDate = (date: Date | undefined | null): string => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '-';
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

    if (activeFilter !== 'All') {
      filtered = filtered.filter(p => p.stage === activeFilter);
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

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ITEMS_PER_PAGE));
  const paginatedProjects = filteredProjects.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // Status counts for filter tabs (exclude deleted)
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.filter(p => !p.deletedAt).forEach(p => {
      counts[p.stage] = (counts[p.stage] || 0) + 1;
    });
    return counts;
  }, [projects]);

  // Summary stats for cards
  const summaryStats = useMemo(() => {
    let totalPipeline = 0;
    let activeLeadsTotal = 0;
    let activeLeadsCount = 0;
    let pqAdvanceTotal = 0;
    let pqAdvanceCount = 0;
    let infoReqCount = 0;
    let uwCount = 0;

    const activeProjects = projects.filter(p => !p.deletedAt);
    activeProjects.forEach(p => {
      const loanAmt = p.loanAmountFromApp || p.loanAmount || 0;
      totalPipeline += loanAmt;
      if (p.stage === 'Active Lead') {
        activeLeadsTotal += loanAmt;
        activeLeadsCount++;
      }
      if (p.stage === 'PQ Advance') {
        pqAdvanceTotal += loanAmt;
        pqAdvanceCount++;
      }
      if (p.stage === 'PQ More Info') infoReqCount++;
      if (p.stage === 'UW') uwCount++;
    });

    return {
      totalPipeline,
      activeProjectsCount: activeProjects.length,
      activeLeadsTotal,
      activeLeadsCount,
      pqAdvanceTotal,
      pqAdvanceCount,
      infoReqCount,
      uwCount,
      needsAttentionCount: infoReqCount + uwCount,
    };
  }, [projects]);

  const showBDO = viewMode === 'all-projects';

  return (
    <BDOLayout title="My Pipeline">
      <div className="space-y-6">
        {/* Title + Toggle + New Project */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-[28px] font-bold text-[#1a1a1a] italic">
              {viewMode === 'my-pipeline' ? 'My Pipeline' : 'All Projects'}
            </h1>
            <div className="flex border border-[#d1d5db] rounded-lg overflow-visible">
              <button
                onClick={() => setViewMode('my-pipeline')}
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  viewMode === 'my-pipeline'
                    ? 'bg-white text-[#1a1a1a] border border-[#2563eb] rounded-lg -m-px z-10'
                    : 'text-[#6b7280]'
                }`}
              >
                My Pipeline
              </button>
              <button
                onClick={() => setViewMode('all-projects')}
                className={`px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  viewMode === 'all-projects'
                    ? 'bg-white text-[#1a1a1a] border border-[#2563eb] rounded-lg -m-px z-10'
                    : 'text-[#6b7280]'
                }`}
              >
                All Projects
              </button>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-[#2563eb] text-white text-[14px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[#1d4ed8] active:bg-[#1e40af] flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5">
            <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Total Pipeline</p>
            <p className="text-[28px] font-bold text-[#1a1a1a]">{formatCompactCurrency(summaryStats.totalPipeline)}</p>
            <p className="text-[12px] text-[#9ca3af] mt-1">{summaryStats.activeProjectsCount} active projects</p>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 relative">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Active Leads</p>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#2563eb] text-white text-[11px] font-bold">{summaryStats.activeLeadsCount}</span>
            </div>
            <p className="text-[28px] font-bold text-[#1a1a1a]">{formatCompactCurrency(summaryStats.activeLeadsTotal)}</p>
            <div className="mt-3 h-1 bg-[#e5e7eb] rounded-full">
              <div
                className="h-1 bg-[#2563eb] rounded-full transition-all"
                style={{ width: summaryStats.totalPipeline > 0 ? `${(summaryStats.activeLeadsTotal / summaryStats.totalPipeline) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 relative">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">PQ Advance</p>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#059669] text-white text-[11px] font-bold">{summaryStats.pqAdvanceCount}</span>
            </div>
            <p className="text-[28px] font-bold text-[#1a1a1a]">{formatCompactCurrency(summaryStats.pqAdvanceTotal)}</p>
            <div className="mt-3 h-1 bg-[#e5e7eb] rounded-full">
              <div
                className="h-1 bg-[#059669] rounded-full transition-all"
                style={{ width: summaryStats.totalPipeline > 0 ? `${(summaryStats.pqAdvanceTotal / summaryStats.totalPipeline) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-5 relative">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-1">Needs Attention</p>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#dc2626] text-white text-[11px] font-bold">{summaryStats.needsAttentionCount}</span>
            </div>
            <p className="text-[28px] font-bold text-[#1a1a1a]">{summaryStats.infoReqCount} Info Req.</p>
            <p className="text-[12px] text-[#9ca3af] mt-1">{summaryStats.uwCount} in Underwriting</p>
          </div>
        </div>

        {/* Search + Filter Tabs + Table */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl">
          {/* Search */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects, clients..."
                className="pl-9 pr-4 py-2 border border-[#e5e7eb] rounded-lg text-[13px] w-[280px] focus:border-[#2563eb] focus:outline-none focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]"
              />
            </div>
          </div>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-5 pb-0">
            {FILTER_TABS.map(tab => {
              const count = tab.key === 'All' ? projects.length : (statusCounts[tab.key] || 0);
              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-2.5 py-2 text-[12px] font-medium rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2563eb] text-white'
                      : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[11px] ${isActive ? 'text-white/80' : 'text-[#9ca3af]'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block animate-spin w-8 h-8 border-4 border-[#2563eb] border-t-transparent rounded-full"></div>
              <p className="text-[#6b7280] mt-4">Loading projects...</p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-16 text-center">
              <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">
                {searchQuery ? 'No projects match your search' : activeFilter !== 'All' ? 'No projects with this status' : 'No projects yet'}
              </h3>
              <p className="text-[#6b7280] mb-6 text-[14px]">
                {searchQuery ? 'Try a different search term' : 'Get started by creating your first project'}
              </p>
              {!searchQuery && activeFilter === 'All' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-5 py-2.5 bg-[#2563eb] text-white text-[14px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[#1d4ed8] inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Project
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-t border-b border-[#e5e7eb]">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Project Name</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Status</th>
                      {showBDO && (
                        <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">BDO</th>
                      )}
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Industry</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Project Total</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Loan Amount</th>
                      <th className="px-5 py-3 text-center text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Priority</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Last Updated</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3f4f6]">
                    {paginatedProjects.map((project) => {
                      const industry = project.industry || '-';
                      const loanAmount = project.loanAmountFromApp || project.loanAmount || 0;
                      const projectTotal = project.projectTotal || 0;
                      const bdo1 = project.bdoUserName || '';
                      const clientName = project.businessName || '';
                      const riskLevel = '';
                      const priority = getPriorityFromRisk(riskLevel);

                      const isDeleted = !!project.deletedAt;

                      return (
                        <tr key={project.id} className={`transition-colors ${isDeleted ? 'bg-red-50/50 opacity-60' : 'hover:bg-[#f8f9fa]'}`}>
                          {/* Project Name */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="text-[14px] font-semibold text-[#1a1a1a]">
                                  {project.projectName}
                                </div>
                                {clientName && clientName !== project.projectName && (
                                  <div className="text-[12px] text-[#9ca3af]">{clientName}</div>
                                )}
                              </div>
                              {isDeleted && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
                                  Deleted
                                </span>
                              )}
                            </div>
                          </td>
                          {/* Status Dropdown */}
                          <td className="px-5 py-3.5 text-center">
                            <select
                              value={project.stage}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleStatusChange(project.id, e.target.value as ProjectStatus);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${getStatusColor(project.stage)} focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:ring-offset-1`}
                            >
                              {PROJECT_STATUSES.map(option => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </td>
                          {/* BDO (only on All Projects) */}
                          {showBDO && (
                            <td className="px-5 py-3.5">
                              {bdo1 ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[10px] font-semibold text-[#374151] flex-shrink-0">
                                    {getBDOInitials(bdo1)}
                                  </div>
                                  <span className="text-[13px] text-[#374151]">{bdo1}</span>
                                </div>
                              ) : (
                                <span className="text-[13px] text-[#9ca3af]">-</span>
                              )}
                            </td>
                          )}
                          {/* Industry */}
                          <td className="px-5 py-3.5 text-[13px] text-[#374151]">
                            {industry}
                          </td>
                          {/* Project Total */}
                          <td className="px-5 py-3.5 text-right text-[14px] font-medium text-[#1a1a1a]">
                            {projectTotal > 0 ? formatCurrency(projectTotal) : '-'}
                          </td>
                          {/* Loan Amount */}
                          <td className="px-5 py-3.5 text-right text-[14px] font-medium text-[#1a1a1a]">
                            {loanAmount > 0 ? formatCurrency(loanAmount) : '-'}
                          </td>
                          {/* Priority */}
                          <td className="px-5 py-3.5 text-center">
                            {priority.label ? (
                              <span className={`inline-block px-3 py-0.5 rounded-full text-[12px] font-medium ${priority.color}`}>
                                {priority.label}
                              </span>
                            ) : (
                              <span className="text-[13px] text-[#9ca3af]">-</span>
                            )}
                          </td>
                          {/* Last Updated */}
                          <td className="px-5 py-3.5 text-[13px] text-[#6b7280]">
                            {formatDate(project.updatedAt)}
                          </td>
                          {/* Actions */}
                          <td className="px-5 py-3.5">
                            <div className="flex gap-2 justify-end items-center">
                              {isDeleted ? (
                                <button
                                  onClick={() => handleRestoreProject(project.id)}
                                  className="px-4 py-1.5 bg-[#059669] text-white text-[13px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[#047857]"
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <Link
                                    href={`/bdo/projects/${project.id}`}
                                    className="px-4 py-1.5 bg-[#2563eb] text-white text-[13px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[#1d4ed8]"
                                  >
                                    Open
                                  </Link>
                                  <div className="relative" ref={openMenuId === project.id ? menuRef : undefined}>
                                    <button
                                      onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#e5e7eb] text-[#6b7280] hover:bg-[#f3f4f6] transition-colors"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {openMenuId === project.id && (
                                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#e5e7eb] rounded-lg shadow-lg z-20 py-1">
                                        <button
                                          onClick={() => { setDeleteTarget({ id: project.id, name: project.projectName }); setOpenMenuId(null); }}
                                          className="w-full text-left px-4 py-2 text-[13px] text-[#dc2626] hover:bg-[#fee2e2] transition-colors"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-[#e5e7eb]">
                <p className="text-[13px] text-[#9ca3af]">
                  {filteredProjects.length} of {projects.length} projects
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="text-[13px] text-[#6b7280] disabled:text-[#d1d5db] flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-md text-[13px] font-medium flex items-center justify-center ${
                        page === currentPage
                          ? 'bg-[#2563eb] text-white'
                          : 'text-[#6b7280] hover:bg-[#f3f4f6]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="text-[13px] text-[#6b7280] disabled:text-[#d1d5db] flex items-center gap-1"
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
                  if (e.key === 'Enter' && !isCreating) {
                    handleCreateProject();
                  }
                }}
                disabled={isCreating}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setNewProjectName('');
              }}
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
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </BDOLayout>
  );
}
