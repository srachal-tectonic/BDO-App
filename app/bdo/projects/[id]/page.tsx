'use client';

import { BDOLayout, getStageColor } from '@/components/layout/BDOLayout';
import BorrowerFormsSection from '@/components/loan-sections/BorrowerFormsSection';
import BusinessApplicantSection from '@/components/loan-sections/BusinessApplicantSection';
import BusinessQuestionnaireSection from '@/components/loan-sections/BusinessQuestionnaireSection';
import CombinedFilesSection from '@/components/loan-sections/CombinedFilesSection';
import FilesSection from '@/components/loan-sections/FilesSection';
import FinancialsSection from '@/components/loan-sections/FinancialsSection';
import FundingStructureSection from '@/components/loan-sections/FundingStructureSection';
import IndividualApplicantsSection from '@/components/loan-sections/IndividualApplicantsSection';
import NotesSection from '@/components/loan-sections/NotesSection';
import OtherOwnedBusinessesSection from '@/components/loan-sections/OtherOwnedBusinessesSection';
import ProjectOverviewSection from '@/components/loan-sections/ProjectOverviewSection';
import SBAEligibilitySection from '@/components/loan-sections/SBAEligibilitySection';
import SellerInfoSection from '@/components/loan-sections/SellerInfoSection';
import VideoMessageSection from '@/components/loan-sections/VideoMessageSection';
import PQMemoForm from '@/components/PQMemoForm';
import ProposalLetterForm from '@/components/ProposalLetterForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useApplication } from '@/lib/applicationStore';
import { getDummyApplicationData } from '@/lib/dummyData';
import { hasSyncedData, mapSyncedDataToStore } from '@/lib/syncedDataMapper';
import { getLoanApplication, getProject, getProjectSourcesUses, migrateLegacySpreadsWorkbook, saveLoanApplication } from '@/services/firestore';
import { Project, SpreadsWorkbook } from '@/types';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const LOAN_APPLICATION_STEPS = [
  { id: 1, title: 'Project Overview', completed: false },
  { id: 2, title: 'Financials', completed: false },
  { id: 3, title: 'Business Applicant', completed: false },
  { id: 4, title: 'Individual Applicants', completed: false },
  { id: 5, title: 'Other Owned Businesses', completed: false },
  { id: 6, title: 'SBA Eligibility', completed: false },
  { id: 7, title: 'Project Information', completed: false },
  { id: 8, title: 'Business Questionnaire', completed: false },
  { id: 9, title: 'Video Message', completed: false },
];

export default function BDOToolsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;
  const { userInfo } = useFirebaseAuth();

  const {
    data: applicationData,
    initializeFromProject,
    loadFromFirestore,
    updateSourcesUses7a,
    updateSourcesUses504,
    updateSourcesUsesExpress,
    updateAllSourcesUses,
  } = useApplication();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('project-overview');
  const [currentSection, setCurrentSection] = useState(1);
  const [loanAppSubTab, setLoanAppSubTab] = useState<'business-applicant' | 'individual-applicants' | 'other-businesses' | 'project-info' | 'business-questionnaire'>('business-applicant');
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>('');
  const [spreadsWorkbooks, setSpreadsWorkbooks] = useState<SpreadsWorkbook[]>([]);
  const [primarySpreadId, setPrimarySpreadId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  // Track changes to application data
  useEffect(() => {
    if (!applicationData.projectId) return;

    const currentData = JSON.stringify(applicationData);
    if (lastSavedData && currentData !== lastSavedData) {
      setHasUnsavedChanges(true);
    }
  }, [applicationData, lastSavedData]);

  // Auto-save loan application data every 30 seconds
  useEffect(() => {
    if (!projectId || !applicationData.projectId) return;

    const autoSaveInterval = setInterval(async () => {
      if (hasUnsavedChanges) {
        await handleSave(false); // Silent save
      }
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [projectId, applicationData, hasUnsavedChanges]);

  /**
   * Load synced data and populate all three Sources & Uses tables.
   * This is called on page mount if a primarySpreadId exists, and also
   * can be called to refresh data.
   */
  const loadPrimarySpreadData = async (projectIdToLoad: string, workbookId: string): Promise<boolean> => {
    try {
      // Fetch synced Sources & Uses data for the specific workbook
      const syncedData = await getProjectSourcesUses(projectIdToLoad, workbookId);

      if (!hasSyncedData(syncedData)) {
        console.log('No synced data found for primary spread');
        return false;
      }

      // Map synced data to store format for each table type
      const mapped7a = mapSyncedDataToStore(syncedData!, '7a');
      const mapped504 = mapSyncedDataToStore(syncedData!, '504');
      const mappedExpress = mapSyncedDataToStore(syncedData!, 'express');

      // Update all three application store tables in a single batched operation
      updateAllSourcesUses({
        sourcesUses7a: mapped7a,
        sourcesUses504: mapped504,
        sourcesUsesExpress: mappedExpress,
      });

      console.log('Loaded primary spread data into tables');
      return true;
    } catch (error) {
      console.error('Error loading primary spread data:', error);
      return false;
    }
  };

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await getProject(projectId);
      console.log('[ProjectPage] Project loaded from database:', {
        id: data?.id,
        projectName: data?.projectName,
        sharepointFolderId: data?.sharepointFolderId,
      });

      if (data) {
        setProject(data);

        // Migrate legacy spreads workbook fields to new array format if needed
        try {
          const migrated = await migrateLegacySpreadsWorkbook(projectId, data);
          if (migrated) {
            // Re-fetch project to get updated data after migration
            const updatedProject = await getProject(projectId);
            if (updatedProject) {
              setProject(updatedProject);
            }
          }
        } catch (migrationError) {
          console.error('[Spreads] Migration error:', migrationError);
        }

        // Set spreads workbooks from project data
        setSpreadsWorkbooks(data.spreadsWorkbooks || []);
        setPrimarySpreadId(data.primarySpreadId);

        // Try to load existing loan application data from database
        const loanAppData = await getLoanApplication(projectId);
        if (loanAppData) {
          // Load existing loan application data from database
          loadFromFirestore(loanAppData);
          setLastSavedData(JSON.stringify(loanAppData));
          setHasUnsavedChanges(false);
          console.log('Loaded existing loan application data from database');
        } else {
          // No existing data, pre-fill the application form with project data
          initializeFromProject(data);
          setLastSavedData(JSON.stringify(applicationData));
          setHasUnsavedChanges(false);
          console.log('Initialized new loan application with project data');
        }

        // If a primary spread is set, load the synced data into the tables
        if (data.primarySpreadId) {
          console.log('Loading primary spread data for:', data.primarySpreadId);
          await loadPrimarySpreadData(projectId, data.primarySpreadId);
        }
      }
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (showNotification = true) => {
    if (!projectId || !applicationData.projectId) return;

    try {
      setIsSaving(true);
      await saveLoanApplication(projectId, applicationData);

      // Mark as saved
      setLastSavedData(JSON.stringify(applicationData));
      setHasUnsavedChanges(false);

      if (showNotification) {
        console.log('✅ Loan application saved successfully');
        // TODO: Add toast notification for better UX
        // toast.success('Loan application saved successfully');
      }
    } catch (error) {
      console.error('❌ Error saving loan application:', error);
      if (showNotification) {
        alert('Failed to save loan application. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFillDummyData = () => {
    if (process.env.NODE_ENV !== 'development') return;

    const dummyData = getDummyApplicationData();
    // Preserve the current projectId when loading dummy data
    loadFromFirestore({
      ...dummyData,
      projectId: projectId,
    });
    setHasUnsavedChanges(true);
    console.log('✅ Dummy data loaded into application');
  };

  const handleNext = async () => {
    // Save before moving to next section
    await handleSave(false);

    if (!completedSections.includes(currentSection)) {
      setCompletedSections([...completedSections, currentSection]);
    }
    if (currentSection < 9) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

  // Handle when a new spreads workbook is created (appends to array)
  const handleWorkbookCreated = (workbook: SpreadsWorkbook) => {
    setSpreadsWorkbooks(prev => [...prev, workbook]);
  };

  // Handle when a spreads workbook is deleted (removes from array)
  const handleWorkbookDeleted = (workbookId: string) => {
    setSpreadsWorkbooks(prev => prev.filter(w => w.workbookId !== workbookId));
  };

  // Handle when a spread is marked as primary
  const handlePrimarySpreadChanged = (workbookId: string) => {
    setPrimarySpreadId(workbookId);
  };

  const renderSectionContent = () => {
    switch (currentSection) {
      case 1:
        return <ProjectOverviewSection />;
      case 2:
        return <FundingStructureSection isReadOnly={false} />;
      case 3:
        return <BusinessApplicantSection />;
      case 4:
        return <IndividualApplicantsSection />;
      case 5:
        return <OtherOwnedBusinessesSection />;
      case 6:
        return <SBAEligibilitySection />;
      case 7:
        return <SellerInfoSection />;
      case 8:
        return <BusinessQuestionnaireSection />;
      case 9:
        return <VideoMessageSection projectId={projectId} />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <BDOLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (!project) {
    return (
      <BDOLayout title="Not Found">
        <Card>
          <CardContent className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
            <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/bdo/projects')}>
              Back to Projects
            </Button>
          </CardContent>
        </Card>
      </BDOLayout>
    );
  }

  return (
    <BDOLayout title={project.projectName} stage={project.stage}>
      {/* Project name, stage badge, and back link */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-[20px] font-semibold text-[#1a1a1a]" data-testid="text-loan-name">
          {project.projectName}
        </h1>
        {project.stage && (
          <span
            className={`px-3 py-1.5 rounded-md text-xs font-medium border whitespace-nowrap ${getStageColor(project.stage)}`}
            data-testid="badge-project-status"
          >
            {project.stage}
          </span>
        )}
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/bdo/projects"
            className="flex items-center gap-1.5 text-[13px] text-[#2563eb] hover:text-[#133c7f] transition-colors font-medium"
            data-testid="button-back-to-projects"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pipeline
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-4 mb-6 border-b border-[var(--t-color-border)]">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-0 w-full justify-start">
            <TabsTrigger value="project-overview" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Project Overview
            </TabsTrigger>
            <TabsTrigger value="loan-application" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Loan Application
            </TabsTrigger>
            <TabsTrigger value="spreads" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Spreads
            </TabsTrigger>
            <TabsTrigger value="pq-memo" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              PQ Memo
            </TabsTrigger>
            <TabsTrigger value="proposal-letter" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Proposal Letter
            </TabsTrigger>
            <TabsTrigger value="notes" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Notes
            </TabsTrigger>
            <TabsTrigger value="borrower-forms" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              PDF Forms
            </TabsTrigger>
            {/* Temporarily hidden: Broker Access tab
            <TabsTrigger value="broker-access" className="px-4 py-2.5 text-[length:var(--t-font-size-base)] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none text-[color:var(--t-color-text-secondary)] data-[state=active]:font-semibold">
              Broker Access
            </TabsTrigger>
            */}
          </TabsList>
        </div>

        <TabsContent value="project-overview" className="mt-0">
          <ProjectOverviewSection />
          <div className="flex gap-3 px-6 pt-4 pb-6 border-t border-[var(--t-color-border)]">
            <button
              onClick={async () => {
                await handleSave(false);
                setActiveTab('loan-application');
              }}
              className="px-6 py-3 bg-[var(--t-color-primary)] text-white text-[length:var(--t-font-size-base)] font-medium rounded-md cursor-pointer transition-all border-none hover-elevate active-elevate-2 flex items-center gap-2"
              data-testid="button-continue-to-loan-app"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </TabsContent>

        <TabsContent value="loan-application" className="mt-0 pt-0">
          {/* Sub-tab navigation bar */}
          <div className="bg-[var(--t-color-primary)] pt-3 pl-6 flex items-end gap-0 overflow-x-auto">
            {([
              { key: 'business-applicant', label: 'Business Applicant' },
              { key: 'individual-applicants', label: 'Individual Applicants' },
              { key: 'other-businesses', label: 'Other Owned Businesses' },
              { key: 'project-info', label: 'Project Information' },
              { key: 'business-questionnaire', label: 'Business Questionnaire' },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setLoanAppSubTab(tab.key)}
                className={`px-4 py-2 text-[length:var(--t-font-size-base)] font-medium whitespace-nowrap transition-colors text-white/90 ${
                  loanAppSubTab === tab.key
                    ? 'bg-[var(--t-color-primary-light)]'
                    : 'bg-transparent hover:bg-white/10'
                }`}
                data-testid={`stepper-step-${tab.key}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sub-tab content */}
          <div className="min-h-[calc(100vh-240px)]">
            <div className="px-7">
              {loanAppSubTab === 'business-applicant' && (
                <>
                  <BusinessApplicantSection />
                  <SBAEligibilitySection />
                </>
              )}
              {loanAppSubTab === 'individual-applicants' && <IndividualApplicantsSection />}
              {loanAppSubTab === 'other-businesses' && <OtherOwnedBusinessesSection />}
              {loanAppSubTab === 'project-info' && <SellerInfoSection />}
              {loanAppSubTab === 'business-questionnaire' && <BusinessQuestionnaireSection />}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3 px-6 pt-4 pb-6 border-t border-[var(--t-color-border)]">
              {loanAppSubTab !== 'business-applicant' && (
                <button
                  onClick={() => {
                    const tabs = ['business-applicant', 'individual-applicants', 'other-businesses', 'project-info', 'business-questionnaire'] as const;
                    const idx = tabs.indexOf(loanAppSubTab);
                    if (idx > 0) setLoanAppSubTab(tabs[idx - 1]);
                  }}
                  className="px-6 py-3 bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] text-[color:var(--t-color-primary)] text-[length:var(--t-font-size-base)] font-medium rounded-md cursor-pointer transition-all hover-elevate active-elevate-2"
                >
                  Previous
                </button>
              )}
              {loanAppSubTab !== 'business-questionnaire' && (
                <button
                  onClick={() => {
                    const tabs = ['business-applicant', 'individual-applicants', 'other-businesses', 'project-info', 'business-questionnaire'] as const;
                    const idx = tabs.indexOf(loanAppSubTab);
                    if (idx < tabs.length - 1) setLoanAppSubTab(tabs[idx + 1]);
                  }}
                  className="px-6 py-3 bg-[var(--t-color-primary)] text-white text-[length:var(--t-font-size-base)] font-medium rounded-md cursor-pointer transition-all border-none hover-elevate active-elevate-2 flex items-center gap-2"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spreads" className="mt-0" forceMount style={{ display: activeTab === 'spreads' ? undefined : 'none' }}>
          <FinancialsSection projectId={projectId}>
            <FundingStructureSection isReadOnly={false} />
          </FinancialsSection>
        </TabsContent>

        <TabsContent value="pq-memo" className="mt-0" forceMount style={{ display: activeTab === 'pq-memo' ? undefined : 'none' }}>
          <PQMemoForm projectId={projectId} />
        </TabsContent>

        <TabsContent value="proposal-letter" className="mt-0">
          <ProposalLetterForm />
        </TabsContent>

        <TabsContent value="notes" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <NotesSection projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrower-forms" className="mt-0">
          <div className="bg-[var(--t-color-card-bg)] border border-[var(--t-color-border)] rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between border-b border-[var(--t-color-border)] px-6 py-4">
              <h2 className="text-[18px] font-semibold text-[color:var(--t-color-text-primary)]">PDF Forms</h2>
            </div>
            <Tabs defaultValue="borrower-forms-sub" className="w-full">
              <div className="px-6 pt-2 border-b border-[var(--t-color-border)]">
                <TabsList className="bg-transparent p-0 h-auto gap-0">
                  <TabsTrigger
                    value="borrower-forms-sub"
                    className="px-4 py-2.5 text-[13px] font-medium uppercase tracking-wider rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none bg-transparent text-[color:var(--t-color-primary-lighter)]"
                    data-testid="tab-borrower-forms-sub"
                  >
                    Borrower Forms
                  </TabsTrigger>
                  <TabsTrigger
                    value="borrower-files-sub"
                    className="px-4 py-2.5 text-[13px] font-medium uppercase tracking-wider rounded-none border-b-2 border-transparent data-[state=active]:border-b-[var(--t-color-primary)] data-[state=active]:text-[color:var(--t-color-primary)] data-[state=active]:bg-[var(--t-color-primary-palest)] data-[state=active]:shadow-none bg-transparent text-[color:var(--t-color-primary-lighter)]"
                    data-testid="tab-borrower-files-sub"
                  >
                    Borrower Files
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="borrower-forms-sub" className="mt-0">
                <div className="px-6 py-6">
                  <BorrowerFormsSection projectId={projectId} />
                </div>
              </TabsContent>
              <TabsContent value="borrower-files-sub" className="mt-0">
                <div className="px-6 py-6">
                  <CombinedFilesSection
                    projectId={projectId}
                    sharepointFolderId={project?.sharepointFolderId}
                  />
                  <div className="mt-4">
                    <FilesSection projectId={projectId} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Temporarily hidden: Broker Access tab content
        <TabsContent value="broker-access" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Broker Document Upload</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Create secure links for brokers to upload documents without logging in.
                </p>
              </div>
              <BrokerTokenManager projectId={projectId} />
            </CardContent>
          </Card>
        </TabsContent>
        */}
      </Tabs>
    </BDOLayout>
  );
}
