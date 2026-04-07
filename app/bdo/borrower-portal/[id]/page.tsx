// BORROWER PORTAL ROUTES TEMPORARILY DISABLED - May be re-enabled in the future
// Redirects to BDO projects page for now

import { redirect } from 'next/navigation';

export default function BorrowerPortalPage() {
  redirect('/bdo/projects');
}

/* ORIGINAL CODE - COMMENTED OUT FOR FUTURE USE
'use client';

import { BDOLayout } from '@/components/layout/BDOLayout';
import BusinessApplicantSection from '@/components/loan-sections/BusinessApplicantSection';
import BusinessQuestionnaireSection from '@/components/loan-sections/BusinessQuestionnaireSection';
import CombinedFilesSection from '@/components/loan-sections/CombinedFilesSection';
import IndividualApplicantsSection from '@/components/loan-sections/IndividualApplicantsSection';
import OtherOwnedBusinessesSection from '@/components/loan-sections/OtherOwnedBusinessesSection';
import PersonalFinancialStatementsSection from '@/components/loan-sections/PersonalFinancialStatementsSection';
import SBAEligibilitySection from '@/components/loan-sections/SBAEligibilitySection';
import SellerInfoSection from '@/components/loan-sections/SellerInfoSection';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useApplication } from '@/lib/applicationStore';
import { getLoanApplication, getProject, saveLoanApplication, updateProject } from '@/services/firestore';
import { Project } from '@/types';
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authenticatedPost } from '@/lib/authenticatedFetch';

const BORROWER_STEPS = [
  { id: 1, title: 'Business Applicant' },
  { id: 2, title: 'Individual Applicants' },
  { id: 3, title: 'Personal Financial Statements' },
  { id: 4, title: 'Other Owned Businesses' },
  { id: 5, title: 'SBA Eligibility' },
  { id: 6, title: 'Project Information' },
  { id: 7, title: 'File Uploads' },
  { id: 8, title: 'Business Questionnaire' },
];

export default function BorrowerPortalPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const { data: applicationData, initializeFromProject, loadFromFirestore } = useApplication();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState(1);
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedData, setLastSavedData] = useState<string>('');

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

  const loadProject = async () => {
    try {
      setIsLoading(true);
      const data = await getProject(projectId);

      if (data) {
        let projectData = data;

        // If project doesn't have a SharePoint folder, create one
        if (!data.sharepointFolderId) {
          try {
            const folderResponse = await authenticatedPost('/api/sharepoint/create-folder', {
              projectName: data.projectName,
            });

            if (folderResponse.ok) {
              const folderData = await folderResponse.json();

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
            }
          } catch (folderError) {
            console.error('Error setting up file storage');
          }
        }

        setProject(projectData);

        // Try to load existing loan application data from database
        const loanAppData = await getLoanApplication(projectId);
        if (loanAppData) {
          // Load existing loan application data from database
          loadFromFirestore(loanAppData);
          setLastSavedData(JSON.stringify(loanAppData));
          setHasUnsavedChanges(false);
        } else {
          // No existing data, pre-fill the application form with project data
          initializeFromProject(projectData);
          setLastSavedData(JSON.stringify(applicationData));
          setHasUnsavedChanges(false);
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
    } catch (error) {
      console.error('Error saving application');
      if (showNotification) {
        alert('Failed to save loan application. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    // Save before moving to next section
    await handleSave(false);

    if (!completedSections.includes(currentSection)) {
      setCompletedSections([...completedSections, currentSection]);
    }
    if (currentSection < 8) {
      setCurrentSection(currentSection + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSection > 1) {
      setCurrentSection(currentSection - 1);
    }
  };

  const renderSectionContent = () => {
    switch (currentSection) {
      case 1:
        return <BusinessApplicantSection />;
      case 2:
        return <IndividualApplicantsSection />;
      case 3:
        return <PersonalFinancialStatementsSection />;
      case 4:
        return <OtherOwnedBusinessesSection />;
      case 5:
        return <SBAEligibilitySection />;
      case 6:
        return <SellerInfoSection />;
      case 7:
        return (
          <CombinedFilesSection
            projectId={projectId}
            sharepointFolderId={project?.sharepointFolderId}
          />
        );
      case 8:
        return <BusinessQuestionnaireSection />;
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
    <BDOLayout title={`Borrower Portal - ${project.projectName}`}>
      <div className="mb-6">
        <Link href="/bdo/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </Link>
      </div>

      <div className="mb-6 bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#e5e7eb] p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {BORROWER_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => setCurrentSection(step.id)}
                className="flex flex-col items-center min-w-[100px] group"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    completedSections.includes(step.id)
                      ? 'bg-green-500 text-white'
                      : currentSection === step.id
                      ? 'bg-[#2563eb] text-white'
                      : 'bg-[#f3f4f6] text-[#6b7280] group-hover:bg-[#e5e7eb]'
                  }`}
                >
                  {completedSections.includes(step.id) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span
                  className={`mt-2 text-[12px] font-medium text-center leading-tight ${
                    currentSection === step.id
                      ? 'text-[#2563eb]'
                      : 'text-[#6b7280]'
                  }`}
                >
                  {step.title}
                </span>
              </button>
              {index < BORROWER_STEPS.length - 1 && (
                <div
                  className={`h-[2px] w-8 mx-2 mt-[-20px] ${
                    completedSections.includes(step.id)
                      ? 'bg-green-500'
                      : 'bg-[#e5e7eb]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="min-h-[400px]">
            {renderSectionContent()}
          </div>

          <div className="flex items-center justify-between pt-6 border-t mt-6">
            <div className="flex gap-3">
              {currentSection > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
              {currentSection < 8 ? (
                <Button onClick={handleNext} className="flex items-center gap-2" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Continue'}
                  {!isSaving && <ChevronRight className="w-4 h-4" />}
                </Button>
              ) : (
                <Button
                  onClick={() => handleSave(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  disabled={isSaving}
                >
                  <Check className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Submit Application'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && !isSaving && (
                <span className="text-sm text-amber-600">Unsaved changes</span>
              )}
              {isSaving && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </BDOLayout>
  );
}
*/
