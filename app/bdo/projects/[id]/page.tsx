'use client';

import { BDOLayout } from '@/components/layout/BDOLayout';
import BrokerTokenManager from '@/components/broker/BrokerTokenManager';
import BusinessApplicantSection from '@/components/loan-sections/BusinessApplicantSection';
import BusinessQuestionnaireSection from '@/components/loan-sections/BusinessQuestionnaireSection';
import CombinedFilesSection from '@/components/loan-sections/CombinedFilesSection';
import FilesSection from '@/components/loan-sections/FilesSection';
import FundingStructureSection from '@/components/loan-sections/FundingStructureSection';
import IndividualApplicantsSection from '@/components/loan-sections/IndividualApplicantsSection';
import NotesSection from '@/components/loan-sections/NotesSection';
import BorrowerFormsSection from '@/components/loan-sections/BorrowerFormsSection';
import OtherOwnedBusinessesSection from '@/components/loan-sections/OtherOwnedBusinessesSection';
import ProjectOverviewSection from '@/components/loan-sections/ProjectOverviewSection';
import ReviewSection from '@/components/loan-sections/ReviewSection';
import VideoMessageSection from '@/components/loan-sections/VideoMessageSection';
import SBAEligibilitySection from '@/components/loan-sections/SBAEligibilitySection';
import SellerInfoSection from '@/components/loan-sections/SellerInfoSection';
import SpreadsSection from '@/components/loan-sections/SpreadsSection';
import PQMemoForm from '@/components/PQMemoForm';
import ProposalLetterForm from '@/components/ProposalLetterForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { useApplication } from '@/lib/applicationStore';
import { authenticatedPost } from '@/lib/authenticatedFetch';
import { getDummyApplicationData } from '@/lib/dummyData';
import { getLoanApplication, getProject, getProjectSourcesUses, migrateLegacySpreadsWorkbook, saveLoanApplication, updateProject } from '@/services/firestore';
import { mapSyncedDataToStore, hasSyncedData } from '@/lib/syncedDataMapper';
import { Project, SpreadsWorkbook } from '@/types';
import { Beaker, Check, ChevronRight, FileEdit, FileText, FileUp, FolderOpen, Link2, Save, Send, StickyNote, Table2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('loan-application');
  const [currentSection, setCurrentSection] = useState(1);
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
        let projectData = data;

        // If project doesn't have a SharePoint folder, create one
        if (!data.sharepointFolderId) {
          console.log('[SharePoint] Project missing SharePoint folder, creating one...');
          try {
            const folderResponse = await authenticatedPost('/api/sharepoint/create-folder', {
              projectName: data.projectName,
            });

            if (folderResponse.ok) {
              const folderData = await folderResponse.json();
              console.log('[SharePoint] Folder created:', folderData);

              // Update project in database with the new folder ID
              await updateProject(projectId, {
                sharepointFolderId: folderData.folderId,
                sharepointFolderUrl: folderData.folderUrl,
              });

              // Update local project data
              projectData = {
                ...data,
                sharepointFolderId: folderData.folderId,
                sharepointFolderUrl: folderData.folderUrl,
              };
              console.log('[SharePoint] Project updated with folder ID');
            } else {
              const errorData = await folderResponse.json();
              console.error('[SharePoint] Failed to create folder:', errorData);
            }
          } catch (folderError) {
            console.error('[SharePoint] Error creating folder:', folderError);
          }
        }

        setProject(projectData);

        // Migrate legacy spreads workbook fields to new array format if needed
        try {
          const migrated = await migrateLegacySpreadsWorkbook(projectId, projectData);
          if (migrated) {
            // Re-fetch project to get updated data after migration
            const updatedProject = await getProject(projectId);
            if (updatedProject) {
              projectData = updatedProject;
              setProject(updatedProject);
            }
          }
        } catch (migrationError) {
          console.error('[Spreads] Migration error:', migrationError);
        }

        // Set spreads workbooks from project data
        setSpreadsWorkbooks(projectData.spreadsWorkbooks || []);
        setPrimarySpreadId(projectData.primarySpreadId);

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
          initializeFromProject(projectData);
          setLastSavedData(JSON.stringify(applicationData));
          setHasUnsavedChanges(false);
          console.log('Initialized new loan application with project data');
        }

        // If a primary spread is set, load the synced data into the tables
        if (projectData.primarySpreadId) {
          console.log('Loading primary spread data for:', projectData.primarySpreadId);
          await loadPrimarySpreadData(projectId, projectData.primarySpreadId);
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
        return (
          <FundingStructureSection
            projectId={projectId}
            existingWorkbooks={spreadsWorkbooks}
            currentUser={userInfo ? { uid: userInfo.uid, displayName: userInfo.displayName } : undefined}
            onWorkbookCreated={handleWorkbookCreated}
            onWorkbookDeleted={handleWorkbookDeleted}
            primarySpreadId={primarySpreadId}
            onPrimarySpreadChanged={handlePrimarySpreadChanged}
          />
        );
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center gap-4 mb-6 border-b border-[#e5e7eb]">
          <TabsList className="bg-transparent border-none p-0 h-auto gap-0 w-full justify-start">
            <TabsTrigger value="loan-application" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <FileText className="w-4 h-4" />
              Loan Application
            </TabsTrigger>
            <TabsTrigger value="spreads" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <Table2 className="w-4 h-4" />
              Spreads
            </TabsTrigger>
            <TabsTrigger value="pq-memo" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <FileEdit className="w-4 h-4" />
              PQ Memo
            </TabsTrigger>
            <TabsTrigger value="proposal-letter" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <Send className="w-4 h-4" />
              Proposal Letter
            </TabsTrigger>
            <TabsTrigger value="notes" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <StickyNote className="w-4 h-4" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="borrower-forms" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <FileText className="w-4 h-4" />
              Borrower Forms and Files
            </TabsTrigger>
            <TabsTrigger value="broker-access" className="px-4 py-2.5 text-[14px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold gap-1.5">
              <Link2 className="w-4 h-4" />
              Broker Access
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            className="gap-2 flex-shrink-0"
            onClick={() => router.push(`/bdo/projects/${projectId}/pdf-tools`)}
          >
            <FileUp className="w-4 h-4" />
            PDF Tools
          </Button>
        </div>

        <TabsContent value="loan-application" className="mt-0">
          {/* Horizontal Stepper */}
          <div className="mb-6">
            <div className="flex items-center py-5 px-4">
              {LOAN_APPLICATION_STEPS.map((step, index) => {
                const isActive = currentSection === step.id;
                const isCompleted = completedSections.includes(step.id);
                const isLast = index === LOAN_APPLICATION_STEPS.length - 1;
                const lineIsBlue = isCompleted;
                return (
                  <div key={step.id} className="flex items-center" style={{ flex: isLast ? '0 0 auto' : '1 1 0' }}>
                    <div
                      className="flex flex-col items-center cursor-pointer relative"
                      onClick={() => setCurrentSection(step.id)}
                    >
                      <div
                        className={`
                          w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold flex-shrink-0 transition-all
                          ${isActive ? 'bg-[#2563eb] text-white ring-[3px] ring-[#2563eb]/20' : ''}
                          ${isCompleted && !isActive ? 'bg-[#2563eb] text-white' : ''}
                          ${!isActive && !isCompleted ? 'bg-[#e5e7eb] text-[#9ca3af]' : ''}
                        `}
                      >
                        {isCompleted && !isActive ? <Check className="w-4 h-4" /> : index + 1}
                      </div>
                      {isActive && (
                        <span className="text-[#2563eb] text-[11px] font-medium mt-1 text-center whitespace-nowrap absolute top-full">
                          {step.title}
                        </span>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`flex-1 h-[3px] mx-1 rounded-full ${lineIsBlue ? 'bg-[#2563eb]' : 'bg-[#e5e7eb]'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
            {/* Section Header */}
            <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-[18px] font-bold text-[#1a1a1a]">
                  {LOAN_APPLICATION_STEPS[currentSection - 1]?.title}
                </h2>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 font-medium">Unsaved changes</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={handleFillDummyData}
                    className="px-3 py-1.5 border border-amber-400 text-amber-600 text-[13px] font-medium rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2"
                  >
                    <Beaker className="w-4 h-4" />
                    Fill Dummy Data
                  </button>
                )}
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="px-4 py-1.5 border border-[#d1d5db] text-[#374151] text-[13px] font-medium rounded-lg hover:bg-[#f3f4f6] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {!isSaving && <Save className="w-4 h-4" />}
                  {isSaving ? 'Saving...' : 'Save Progress'}
                </button>
              </div>
            </div>

            {/* Section Content */}
            <div className="min-h-[400px]">
              {renderSectionContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 px-4 sm:px-6 pt-4 pb-6 border-t border-[#e5e7eb]">
              {currentSection > 1 && (
                <button
                  onClick={handlePrevious}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-[#d1d5db] text-[#374151] text-[15px] font-medium rounded-lg cursor-pointer transition-all hover:bg-[#f3f4f6]"
                >
                  Previous
                </button>
              )}
              {currentSection < 9 ? (
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-[#2563eb] text-white text-[15px] font-medium rounded-lg cursor-pointer transition-all border-none hover:bg-[#1d4ed8] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Continue'}
                  {!isSaving && <ChevronRight className="w-4 h-4" />}
                </button>
              ) : (
                <button
                  onClick={() => handleSave(true)}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3 bg-[#10b981] text-white text-[15px] font-medium rounded-lg cursor-pointer transition-all border-none hover:bg-[#059669] flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save All Changes'}
                </button>
              )}
              {hasUnsavedChanges && !isSaving && (
                <span className="text-sm text-amber-600 self-center ml-auto">Unsaved changes</span>
              )}
              {isSaving && (
                <span className="text-sm text-[#6b7280] self-center ml-auto">Saving...</span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="spreads" className="mt-0">
          <Card>
            <CardContent className="pt-6">
              <SpreadsSection
                projectId={projectId}
                projectName={project?.projectName}
                existingWorkbooks={spreadsWorkbooks}
                currentUser={userInfo ? { uid: userInfo.uid, displayName: userInfo.displayName } : undefined}
                onWorkbookCreated={handleWorkbookCreated}
                onWorkbookDeleted={handleWorkbookDeleted}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pq-memo" className="mt-0">
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
          <Tabs defaultValue="borrower-forms-sub" className="w-full">
            <TabsList className="bg-transparent border-none p-0 h-auto gap-0 mb-4 border-b border-[#e5e7eb] w-full justify-start">
              <TabsTrigger value="borrower-forms-sub" className="px-4 py-2 text-[13px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold">
                Borrower Forms
              </TabsTrigger>
              <TabsTrigger value="borrower-files-sub" className="px-4 py-2 text-[13px] font-medium rounded-none border-b-2 border-transparent data-[state=active]:border-b-[#2563eb] data-[state=active]:text-[#2563eb] data-[state=active]:bg-transparent data-[state=active]:shadow-none text-[#6b7280] data-[state=active]:font-semibold">
                Borrower Files
              </TabsTrigger>
            </TabsList>
            <TabsContent value="borrower-forms-sub" className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <BorrowerFormsSection projectId={projectId} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="borrower-files-sub" className="mt-0">
              <Card>
                <CardContent className="pt-6">
                  <CombinedFilesSection
                    projectId={projectId}
                    sharepointFolderId={project?.sharepointFolderId}
                  />
                </CardContent>
              </Card>
              <Card className="mt-4">
                <CardContent className="pt-6">
                  <FilesSection projectId={projectId} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

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
      </Tabs>
    </BDOLayout>
  );
}
