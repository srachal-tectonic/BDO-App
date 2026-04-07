'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { BDOLayout } from '@/components/layout/BDOLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useApplication } from '@/lib/applicationStore';
import { collection, query, getDocs, doc, setDoc, getDoc, db } from '@/lib/db';
import { getProject, getLoanApplication } from '@/services/firestore';
import { ArrowLeft, Sparkles, Loader2, AlertCircle, FileDown } from 'lucide-react';
import Link from 'next/link';
import { evaluateRule, generateQuestionnairePdf, type QuestionnaireRule, type QuestionnaireResponse } from '@/lib/questionnairePdf';
import { useParams } from 'next/navigation';
import type { Project } from '@/types';
import { authenticatedPost } from '@/lib/authenticatedFetch';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

function TiptapEditor({ content, onChange, placeholder }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border border-[#d1d5db] rounded-lg overflow-hidden">
      <div className="bg-[#f9fafb] border-b border-[#e5e7eb] px-4 py-2 flex gap-2 flex-wrap">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bold') ? 'bg-[#2563eb] text-white' : 'bg-white text-[#374151] border border-[#d1d5db]'
          }`}
          type="button"
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('italic') ? 'bg-[#2563eb] text-white' : 'bg-white text-[#374151] border border-[#d1d5db]'
          }`}
          type="button"
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('bulletList') ? 'bg-[#2563eb] text-white' : 'bg-white text-[#374151] border border-[#d1d5db]'
          }`}
          type="button"
        >
          Bullet List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('orderedList') ? 'bg-[#2563eb] text-white' : 'bg-white text-[#374151] border border-[#d1d5db]'
          }`}
          type="button"
        >
          Numbered List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 text-sm font-medium rounded hover:bg-gray-100 transition-colors ${
            editor.isActive('heading', { level: 2 }) ? 'bg-[#2563eb] text-white' : 'bg-white text-[#374151] border border-[#d1d5db]'
          }`}
          type="button"
        >
          Heading
        </button>
      </div>
      <EditorContent editor={editor} className="bg-white" />
    </div>
  );
}

interface AIBlockTemplate {
  id: string;
  name: string;
  description: string;
  inputFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number';
    placeholder?: string;
    required: boolean;
  }>;
  prompt: string;
}

interface QuestionBlockProps {
  rule: QuestionnaireRule;
  projectId: string;
  existingResponse?: QuestionnaireResponse;
}

function QuestionBlock({ rule, projectId, existingResponse }: QuestionBlockProps) {
  const [content, setContent] = useState(existingResponse?.content || '');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const responseRef = doc(db, 'questionnaireResponses', `${projectId}_${rule.id}`);
        await setDoc(responseRef, {
          projectId,
          ruleId: rule.id,
          content: newContent,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error saving response:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    setSaveTimeout(timeout);
  }, [saveTimeout, projectId, rule.id]);

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-[#1f2937]">{rule.questionText}</h3>
        {isSaving && (
          <span className="text-xs text-[#6b7280]">Saving...</span>
        )}
      </div>
      <TiptapEditor
        content={content}
        onChange={handleContentChange}
        placeholder="Enter your answer here..."
      />
    </div>
  );
}

interface AIGeneratedBlockProps {
  rule: QuestionnaireRule;
  projectId: string;
  template: AIBlockTemplate;
  existingResponse?: QuestionnaireResponse;
  applicationData: any;
}

function AIGeneratedBlock({ rule, projectId, template, existingResponse, applicationData }: AIGeneratedBlockProps) {
  const [inputData, setInputData] = useState<Record<string, any>>(existingResponse?.generatedInputData || {});
  const [generatedContent, setGeneratedContent] = useState(existingResponse?.content || '');
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await authenticatedPost('/api/generate-questionnaire-content', {
        templateId: template.id,
        inputData,
        projectData: {
          projectName: applicationData.projectOverview?.projectName || '',
          industry: applicationData.projectOverview?.industry || '',
          naicsCode: applicationData.projectOverview?.naicsCode || '',
          primaryProjectPurpose: applicationData.projectOverview?.primaryProjectPurpose || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate content');
      }

      const data = await response.json();
      setGeneratedContent(data.content);

      // Save the generated content
      const responseRef = doc(db, 'questionnaireResponses', `${projectId}_${rule.id}`);
      await setDoc(responseRef, {
        projectId,
        ruleId: rule.id,
        content: data.content,
        generatedInputData: inputData,
        updatedAt: new Date(),
      }, { merge: true });
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
      console.error('Error generating content:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentChange = useCallback((newContent: string) => {
    setGeneratedContent(newContent);

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        const responseRef = doc(db, 'questionnaireResponses', `${projectId}_${rule.id}`);
        await setDoc(responseRef, {
          projectId,
          ruleId: rule.id,
          content: newContent,
          generatedInputData: inputData,
          updatedAt: new Date(),
        }, { merge: true });
      } catch (error) {
        console.error('Error saving response:', error);
      } finally {
        setIsSaving(false);
      }
    }, 1000);

    setSaveTimeout(timeout);
  }, [saveTimeout, inputData, projectId, rule.id]);

  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const handleInputChange = (fieldName: string, value: any) => {
    setInputData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const isFormValid = template.inputFields.every(field =>
    !field.required || (inputData[field.name] !== undefined && inputData[field.name] !== '')
  );

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-lg p-6 mb-6">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-medium text-[#1f2937]">{template.name}</h3>
          {isSaving && (
            <span className="text-xs text-[#6b7280]">Saving...</span>
          )}
        </div>
        <p className="text-sm text-[#6b7280]">{template.description}</p>
      </div>

      <div className="space-y-4 mb-6">
        {template.inputFields.map((field) => (
          <div key={field.name}>
            <Label htmlFor={`input-${field.name}`} className="text-sm font-medium text-[#374151] mb-1.5 block">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            {field.type === 'textarea' ? (
              <Textarea
                id={`input-${field.name}`}
                value={inputData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full"
              />
            ) : field.type === 'number' ? (
              <Input
                id={`input-${field.name}`}
                type="number"
                value={inputData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full"
              />
            ) : (
              <Input
                id={`input-${field.name}`}
                type="text"
                value={inputData[field.name] || ''}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full"
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!isFormValid || isGenerating}
        className="mb-6"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate with AI
          </>
        )}
      </Button>

      {generatedContent && (
        <div>
          <Label className="text-sm font-medium text-[#374151] mb-2 block">Generated Content (Editable)</Label>
          <TiptapEditor
            content={generatedContent}
            onChange={handleContentChange}
            placeholder="Generated content will appear here..."
          />
        </div>
      )}
    </div>
  );
}

export default function QuestionnairePage() {
  const params = useParams();
  const projectId = params?.id as string;

  const { data: applicationData, loadFromFirestore, initializeFromProject } = useApplication();
  const [project, setProject] = useState<Project | null>(null);
  const [rules, setRules] = useState<QuestionnaireRule[]>([]);
  const [responses, setResponses] = useState<QuestionnaireResponse[]>([]);
  const [templates, setTemplates] = useState<AIBlockTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadAllData();
    }
  }, [projectId]);

  const loadAllData = async () => {
    try {
      setIsLoading(true);

      // Load project data
      const projectData = await getProject(projectId);
      if (projectData) {
        setProject(projectData);

        // Try to load existing loan application data from database
        const loanAppData = await getLoanApplication(projectId);
        if (loanAppData) {
          loadFromFirestore(loanAppData);
        } else {
          initializeFromProject(projectData);
        }
      }

      // Load questionnaire rules from admin settings
      const adminDoc = await getDoc(doc(db, 'adminSettings', 'config'));
      if (adminDoc.exists()) {
        const adminData = adminDoc.data();
        setRules(adminData.questionnaireRules || []);
        setTemplates(adminData.aiBlockTemplates || []);
      }

      // Load existing responses for this project
      const responsesQuery = query(collection(db, 'questionnaireResponses'));
      const responsesSnapshot = await getDocs(responsesQuery);
      const projectResponses = responsesSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as QuestionnaireResponse))
        .filter((r: any) => r.projectId === projectId);
      setResponses(projectResponses);
    } catch (error) {
      console.error('Error loading questionnaire data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!project) return;

    setIsExporting(true);
    try {
      // Reload responses from database to get latest data
      const responsesQuery = query(collection(db, 'questionnaireResponses'));
      const responsesSnapshot = await getDocs(responsesQuery);
      const latestResponses = responsesSnapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() } as QuestionnaireResponse))
        .filter((r: any) => r.projectId === projectId);

      const rawPurpose = applicationData?.projectOverview?.primaryProjectPurpose;
      const primaryProjectPurpose = Array.isArray(rawPurpose) ? rawPurpose.join(', ') : rawPurpose;
      const pdfBytes = await generateQuestionnairePdf(
        project.projectName,
        applicableRules,
        latestResponses,
        primaryProjectPurpose
      );

      // Create blob and download
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Business_Questionnaire.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <BDOLayout title="Loading...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading questionnaire...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (!project) {
    return (
      <BDOLayout title="Not Found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-6">The project you're looking for doesn't exist.</p>
          <Link href="/bdo/projects">
            <Button>Back to Projects</Button>
          </Link>
        </div>
      </BDOLayout>
    );
  }

  // Get project data for filtering
  const selectedPurposes: string[] = Array.isArray(applicationData?.projectOverview?.primaryProjectPurpose)
    ? applicationData.projectOverview.primaryProjectPurpose
    : [];
  const naicsCode: string = applicationData?.projectOverview?.naicsCode || '';
  const businessStage: string = applicationData?.projectOverview?.classification?.businessStage || '';

  const applicableRules = rules
    .filter(rule => evaluateRule(rule, selectedPurposes, naicsCode, businessStage))
    .sort((a, b) => {
      // Sort by category order first, then by questionOrder/order within category
      const categoryOrder: Record<string, number> = { 'Business Overview': 0, 'Project Purpose': 1, 'Industry': 2 };
      const catDiff = (categoryOrder[a.mainCategory] ?? 9) - (categoryOrder[b.mainCategory] ?? 9);
      if (catDiff !== 0) return catDiff;
      // Within same category, sort by purposeKey then questionOrder
      if (a.purposeKey !== b.purposeKey) return (a.purposeKey || '').localeCompare(b.purposeKey || '');
      return (a.questionOrder ?? a.order) - (b.questionOrder ?? b.order);
    });

  // Group rules by category and sub-category
  const groupedRules = new Map<string, { label: string; rules: QuestionnaireRule[] }[]>();
  for (const rule of applicableRules) {
    if (!groupedRules.has(rule.mainCategory)) {
      groupedRules.set(rule.mainCategory, []);
    }
    const groups = groupedRules.get(rule.mainCategory)!;
    const subLabel = rule.mainCategory === 'Project Purpose' && rule.purposeKey ? rule.purposeKey : '';
    let group = groups.find(g => g.label === subLabel);
    if (!group) {
      group = { label: subLabel, rules: [] };
      groups.push(group);
    }
    group.rules.push(rule);
  }

  const getResponseForRule = (ruleId: string) => {
    return responses.find(r => r.ruleId === ruleId);
  };

  const getTemplateById = (templateId: string) => {
    return templates.find(t => t.id === templateId);
  };

  return (
    <BDOLayout title={`Business Questionnaire - ${project.projectName}`}>
      <div className="mb-6">
        <Link href={`/bdo/borrower-portal/${projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Application
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)] border border-[#e5e7eb] p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-[#1a1a1a]">Business Questionnaire</h1>
            <p className="text-sm text-[#6b7280] mt-1">
              Answer the following questions based on your project details
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting || applicableRules.length === 0}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Export to PDF
              </>
            )}
          </Button>
        </div>

        {applicableRules.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">No Questions Available</h3>
            <p className="text-sm text-blue-800">
              No questionnaire items match this project's criteria. The questionnaire is dynamically generated based on your project details.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Auto-Save Enabled</p>
                  <p className="text-blue-800">
                    The following questions are tailored to your project based on the details you've provided.
                    Your responses are automatically saved as you type.
                  </p>
                </div>
              </div>
            </div>

            {(['Business Overview', 'Project Purpose', 'Industry'] as const).map((category) => {
              const groups = groupedRules.get(category);
              if (!groups || groups.length === 0) return null;

              return (
                <div key={category}>
                  {/* Category Header */}
                  <div className="border-b-2 border-[#2563eb] pb-2 mb-6 mt-2">
                    <h2 className="text-xl font-bold text-[#1a1a1a]">{category}</h2>
                    {category === 'Business Overview' && (
                      <p className="text-sm text-[#6b7280] mt-1">General questions about your business</p>
                    )}
                    {category === 'Project Purpose' && (
                      <p className="text-sm text-[#6b7280] mt-1">Questions specific to your selected use of proceeds</p>
                    )}
                    {category === 'Industry' && (
                      <p className="text-sm text-[#6b7280] mt-1">Questions specific to your industry</p>
                    )}
                  </div>

                  {groups.map((group) => (
                    <div key={group.label || '_default'}>
                      {/* Sub-category header for Project Purpose groups */}
                      {group.label && (
                        <div className="flex items-center gap-2 mb-4 mt-6">
                          <div className="h-px flex-1 bg-[#e5e7eb]" />
                          <span className="text-sm font-semibold text-[#2563eb] px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                            {group.label}
                          </span>
                          <div className="h-px flex-1 bg-[#e5e7eb]" />
                        </div>
                      )}

                      {group.rules.map((rule) => {
                        const existingResponse = getResponseForRule(rule.id);

                        if (rule.blockType === 'question') {
                          return (
                            <QuestionBlock
                              key={rule.id}
                              rule={rule}
                              projectId={projectId}
                              existingResponse={existingResponse}
                            />
                          );
                        } else if (rule.blockType === 'ai-generated' && rule.aiBlockTemplateId) {
                          const template = getTemplateById(rule.aiBlockTemplateId);
                          if (!template) return null;
                          return (
                            <AIGeneratedBlock
                              key={rule.id}
                              rule={rule}
                              projectId={projectId}
                              template={template}
                              existingResponse={existingResponse}
                              applicationData={applicationData}
                            />
                          );
                        }

                        return null;
                      })}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BDOLayout>
  );
}
