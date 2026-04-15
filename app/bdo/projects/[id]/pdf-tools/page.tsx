'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Download, Save, Trash2, ChevronRight, Check, X, Loader2, FileUp, Settings, List } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import { authenticatedFetch, authenticatedPost } from '@/lib/authenticatedFetch';
import { BDOLayout } from '@/components/layout/BDOLayout';
import type { PdfMappingTemplate, PdfImportSession, PdfFieldMapping, ExtractedField, AppSection } from '@/types';

interface MappingSuggestion {
  pdfFieldName: string;
  suggestedSection: string;
  suggestedPath: string;
  confidence: number;
}

export default function PdfToolsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const { userInfo, isLoading: authLoading } = useFirebaseAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const envelopeInputRef = useRef<HTMLInputElement>(null);
  const [isImportingEnvelope, setIsImportingEnvelope] = useState(false);

  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates'>('import');
  const [exportFormType, setExportFormType] = useState<string>('sba-1919');
  const [isExporting, setIsExporting] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'review'>('upload');
  const [selectedSession, setSelectedSession] = useState<PdfImportSession | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);
  const [mappings, setMappings] = useState<PdfFieldMapping[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Data fetching states
  const [templates, setTemplates] = useState<PdfMappingTemplate[]>([]);
  const [importSessions, setImportSessions] = useState<PdfImportSession[]>([]);
  const [appFields, setAppFields] = useState<Record<string, AppSection>>({});
  const [isLoadingData, setIsLoadingData] = useState(true);
  const hasFetchedRef = useRef(false);

  // Fetch initial data - only once
  useEffect(() => {
    if (!projectId || authLoading) return;
    if (!userInfo) {
      router.push('/bdo/login');
      return;
    }

    // Prevent duplicate fetches
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        // Fetch all data in parallel
        const [templatesRes, sessionsRes, fieldsRes] = await Promise.all([
          authenticatedFetch('/api/pdf-templates'),
          authenticatedFetch(`/api/projects/${projectId}/pdf-imports`),
          authenticatedFetch('/api/pdf-imports/app-fields'),
        ]);

        if (templatesRes.ok) {
          setTemplates(await templatesRes.json());
        }
        if (sessionsRes.ok) {
          setImportSessions(await sessionsRes.json());
        }
        if (fieldsRes.ok) {
          setAppFields(await fieldsRes.json());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [projectId, userInfo, authLoading, router]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Invalid file type', description: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];

        const response = await authenticatedPost('/api/pdf-imports/upload', {
          projectId,
          fileName: file.name,
          pdfData: base64,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        setSelectedSession(data.session);
        setExtractedFields(data.session.extractedFields || []);
        setSuggestions(data.suggestions || []);

        // Create initial mappings from suggestions
        const initialMappings: PdfFieldMapping[] = data.suggestions.map((s: MappingSuggestion) => ({
          pdfFieldName: s.pdfFieldName,
          pdfFieldType: 'text' as const,
          appSection: s.suggestedSection as PdfFieldMapping['appSection'],
          appFieldPath: s.suggestedPath,
          transformType: 'direct' as const,
        }));
        setMappings(initialMappings);

        setImportStep('mapping');

        // Refresh sessions list
        const sessionsRes = await authenticatedFetch(`/api/projects/${projectId}/pdf-imports`);
        if (sessionsRes.ok) {
          setImportSessions(await sessionsRes.json());
        }

        toast({ title: 'PDF uploaded successfully', description: `Found ${data.session.extractedFields?.length || 0} form fields` });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: 'Upload failed', description: 'Could not process the PDF file', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEnvelopeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Invalid file type', description: 'Please select a PDF file', variant: 'destructive' });
      return;
    }

    setIsImportingEnvelope(true);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1] ?? '');
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/projects/${projectId}/envelope-pdf/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, pdfData: base64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const payload = await res.json();
      const extracted = payload.extractedFieldCount ?? 0;
      const mapped = payload.mappedFieldCount ?? 0;
      const applied = payload.appliedFieldCount ?? 0;

      if (applied === 0) {
        toast({
          title: 'Envelope PDF imported — 0 fields applied',
          description: `${extracted} AcroForm fields found, ${mapped} matched the envelope map, ${applied} actually written. The PDF was likely not produced by the T Bank envelope generator.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Envelope PDF imported',
          description: `Applied ${applied} field(s) to the loan application (${mapped} matched, ${extracted} extracted). Reload project tabs to see the updated data.`,
        });
      }
    } catch (err: any) {
      console.error('Envelope import failed:', err);
      toast({
        title: 'Envelope import failed',
        description: err?.message ?? 'Could not process the PDF file',
        variant: 'destructive',
      });
    } finally {
      setIsImportingEnvelope(false);
      if (envelopeInputRef.current) envelopeInputRef.current.value = '';
    }
  };

  const updateMapping = (pdfFieldName: string, updates: Partial<PdfFieldMapping>) => {
    setMappings(prev => {
      const existing = prev.find(m => m.pdfFieldName === pdfFieldName);
      if (existing) {
        return prev.map(m => m.pdfFieldName === pdfFieldName ? { ...m, ...updates } : m);
      } else {
        return [...prev, {
          pdfFieldName,
          pdfFieldType: 'text' as const,
          appSection: 'projectOverview' as const,
          appFieldPath: '',
          transformType: 'direct' as const,
          ...updates
        } as PdfFieldMapping];
      }
    });
  };

  const removeMapping = (pdfFieldName: string) => {
    setMappings(prev => prev.filter(m => m.pdfFieldName !== pdfFieldName));
  };

  const applyTemplate = (template: PdfMappingTemplate) => {
    setMappings(template.mappings);
    toast({ title: 'Template applied', description: `Applied ${template.mappings.length} field mappings` });
  };

  const loadSession = (session: PdfImportSession) => {
    setSelectedSession(session);

    const fields: ExtractedField[] = (session.extractedFields || []).map(field => ({
      name: field.name,
      type: field.type,
      value: field.value ?? '',
      options: undefined,
    }));
    setExtractedFields(fields);

    if (session.appliedMappings && session.appliedMappings.length > 0) {
      setMappings(session.appliedMappings as PdfFieldMapping[]);
    } else {
      const initialMappings: PdfFieldMapping[] = fields.map(field => ({
        pdfFieldName: field.name,
        pdfFieldType: 'text' as const,
        appSection: 'projectOverview' as const,
        appFieldPath: '',
        transformType: 'direct' as const,
      }));
      setMappings(initialMappings);
    }

    setImportStep('mapping');
    toast({
      title: 'Session loaded',
      description: `Loaded "${session.fileName}" with ${session.extractedFields?.length || 0} fields`
    });
  };

  const getFieldValue = (fieldName: string) => {
    const field = extractedFields.find(f => f.name === fieldName);
    return field?.value ?? '';
  };

  const handleSaveMappings = async () => {
    if (!selectedSession) return;

    setIsSavingMappings(true);
    try {
      const response = await authenticatedFetch(`/api/pdf-imports/${selectedSession.id}/mappings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });

      if (!response.ok) throw new Error('Failed to save mappings');

      setImportStep('review');
      toast({ title: 'Mappings saved' });
    } catch (error) {
      toast({ title: 'Failed to save mappings', variant: 'destructive' });
    } finally {
      setIsSavingMappings(false);
    }
  };

  const handleApplyImport = async () => {
    if (!selectedSession) return;

    setIsApplying(true);
    try {
      const response = await authenticatedPost(`/api/pdf-imports/${selectedSession.id}/apply`, {});

      if (!response.ok) throw new Error('Failed to apply import');

      toast({
        title: 'Import applied successfully',
        description: 'Data has been populated. Go to Loan Application tab to see the imported data.'
      });

      // Reset state
      setImportStep('upload');
      setSelectedSession(null);
      setExtractedFields([]);
      setMappings([]);

      // Refresh sessions
      const sessionsRes = await authenticatedFetch(`/api/projects/${projectId}/pdf-imports`);
      if (sessionsRes.ok) {
        setImportSessions(await sessionsRes.json());
      }
    } catch (error) {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName || !selectedSession) return;

    setIsSavingTemplate(true);
    try {
      const response = await authenticatedPost('/api/pdf-templates', {
        name: templateName,
        sourceFormName: selectedSession.fileName,
        mappings: mappings.filter(m => m.appSection && m.appFieldPath),
      });

      if (!response.ok) throw new Error('Failed to save template');

      toast({ title: 'Template saved' });
      setTemplateName('');

      // Refresh templates
      const templatesRes = await authenticatedFetch('/api/pdf-templates');
      if (templatesRes.ok) {
        setTemplates(await templatesRes.json());
      }
    } catch (error) {
      toast({ title: 'Failed to save template', variant: 'destructive' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const response = await authenticatedFetch(`/api/pdf-templates/${templateId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast({ title: 'Template deleted' });

      // Refresh templates
      const templatesRes = await authenticatedFetch('/api/pdf-templates');
      if (templatesRes.ok) {
        setTemplates(await templatesRes.json());
      }
    } catch (error) {
      toast({ title: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const handleExportPdf = async (mode: 'blank' | 'prefilled') => {
    setIsExporting(true);
    try {
      const response = await authenticatedPost(`/api/pdf-exports/${projectId}`, {
        formType: exportFormType,
        mode,
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportFormType}-${mode}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDF exported successfully',
        description: mode === 'blank' ? 'Blank form downloaded' : 'Pre-filled form downloaded'
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Could not generate PDF',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (authLoading || isLoadingData) {
    return (
      <BDOLayout title="PDF Tools">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading PDF Tools...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (!userInfo) {
    return null;
  }

  return (
    <BDOLayout title="PDF Tools">
      <div className="border-b border-border bg-background mb-6">
        <div className="flex items-center gap-4 pb-4">
          <Link href={`/bdo/projects/${projectId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">PDF Tools</h1>
            <p className="text-sm text-muted-foreground">Import PDF forms and map fields to application data</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export' | 'templates')}>
        <TabsList className="mb-6">
          <TabsTrigger value="import" className="gap-2">
            <FileUp className="w-4 h-4" />
            Import PDF
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" />
            Export PDF
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <Settings className="w-4 h-4" />
            Mapping Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <div className="flex gap-2 mb-6">
            <Badge variant={importStep === 'upload' ? 'default' : 'secondary'} className="gap-1">
              {importStep !== 'upload' ? <Check className="w-3 h-3" /> : '1'}
              Upload
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant={importStep === 'mapping' ? 'default' : 'secondary'} className="gap-1">
              {importStep === 'review' ? <Check className="w-3 h-3" /> : '2'}
              Map Fields
            </Badge>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant={importStep === 'review' ? 'default' : 'secondary'} className="gap-1">
              3
              Review & Apply
            </Badge>
          </div>

          {importStep === 'upload' && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Fillable PDF</CardTitle>
                <CardDescription>
                  Select a fillable PDF form to extract field data and map it to the application.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <input
                  ref={envelopeInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleEnvelopeImport}
                  className="hidden"
                />
                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold mb-1">Import Business Applicant / Project Information</h3>
                      <p className="text-xs text-muted-foreground">
                        Upload the filled envelope PDF — fields like <code>ba_legalName</code>, <code>ia0_firstName</code>, <code>po_projectName</code>, etc. are auto-mapped directly into this project's data in Cosmos DB. No manual mapping step.
                      </p>
                    </div>
                    <Button
                      onClick={() => envelopeInputRef.current?.click()}
                      disabled={isImportingEnvelope}
                      className="gap-2 shrink-0"
                      data-testid="button-import-envelope-pdf"
                    >
                      {isImportingEnvelope ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Importing…
                        </>
                      ) : (
                        <>
                          <FileUp className="w-4 h-4" />
                          Import Envelope PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-12 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5"
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-12 h-12 text-primary animate-spin" />
                      <p className="text-muted-foreground">Processing PDF...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="w-12 h-12 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Click to upload a PDF</p>
                        <p className="text-sm text-muted-foreground">or drag and drop</p>
                      </div>
                    </div>
                  )}
                </div>

                {importSessions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-3">Recent Imports</h3>
                    <div className="space-y-2">
                      {importSessions.slice(0, 5).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer"
                          onClick={() => loadSession(session)}
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{session.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {session.extractedFields?.length || 0} fields &bull; {session.appliedMappings?.length || 0} mappings
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={session.status === 'applied' ? 'default' : 'secondary'}>
                              {session.status}
                            </Badge>
                            <Button variant="ghost" size="sm" className="gap-1">
                              {session.status === 'applied' ? 'Edit & Re-apply' : 'Continue'}
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {importStep === 'mapping' && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Map PDF Fields</CardTitle>
                    <CardDescription>
                      Connect PDF form fields to application form fields. Auto-suggested mappings are pre-filled.
                    </CardDescription>
                  </div>
                  {templates.length > 0 && (
                    <Select onValueChange={(id) => {
                      const template = templates.find(t => t.id === id);
                      if (template) applyTemplate(template);
                    }}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Apply template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {extractedFields.map((field) => {
                    const mapping = mappings.find(m => m.pdfFieldName === field.name);
                    const suggestion = suggestions.find(s => s.pdfFieldName === field.name);

                    return (
                      <div key={field.name} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-start p-3 bg-muted rounded-lg">
                        <div>
                          <Label className="text-xs text-muted-foreground">PDF Field</Label>
                          <p className="font-medium text-sm">{field.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            Value: {String(field.value || '(empty)').substring(0, 50)}
                          </p>
                        </div>

                        <ChevronRight className="w-4 h-4 text-muted-foreground mt-6" />

                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Application Section</Label>
                            <Select
                              value={mapping?.appSection || ''}
                              onValueChange={(value) => updateMapping(field.name, {
                                appSection: value as PdfFieldMapping['appSection'],
                                appFieldPath: ''
                              })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select section..." />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(appFields).map(([key, section]) => (
                                  <SelectItem key={key} value={key}>
                                    {section.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {mapping?.appSection && appFields[mapping.appSection] && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Field</Label>
                              <Select
                                value={mapping?.appFieldPath || ''}
                                onValueChange={(value) => updateMapping(field.name, { appFieldPath: value })}
                              >
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select field..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {appFields[mapping.appSection].fields.map((f) => (
                                    <SelectItem key={f.path} value={f.path}>
                                      {f.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {suggestion && suggestion.confidence >= 0.7 && !mapping?.appSection && (
                            <p className="text-xs text-green-600">
                              Suggested: {appFields[suggestion.suggestedSection]?.label} → {
                                appFields[suggestion.suggestedSection]?.fields.find(f => f.path === suggestion.suggestedPath)?.label
                              }
                            </p>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="mt-5"
                          onClick={() => removeMapping(field.name)}
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setImportStep('upload')}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleSaveMappings}
                    disabled={mappings.filter(m => m.appSection && m.appFieldPath).length === 0 || isSavingMappings}
                  >
                    {isSavingMappings && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Continue to Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {importStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Apply Import</CardTitle>
                <CardDescription>
                  Review the mappings below. When applied, the PDF field values will populate the application forms.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {mappings.filter(m => m.appSection && m.appFieldPath).map((mapping) => (
                    <div key={mapping.pdfFieldName} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <Check className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <span className="font-medium text-sm">{mapping.pdfFieldName}</span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="text-sm">
                          {appFields[mapping.appSection]?.label} / {
                            appFields[mapping.appSection]?.fields.find(f => f.path === mapping.appFieldPath)?.label
                          }
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground bg-background px-2 py-1 rounded">
                        {String(getFieldValue(mapping.pdfFieldName)).substring(0, 30) || '(empty)'}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex items-end gap-3 mb-4">
                    <div className="flex-1">
                      <Label htmlFor="template-name">Save as Template (optional)</Label>
                      <Input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g., SBA Form 1919 Mapping"
                      />
                    </div>
                    <Button
                      variant="outline"
                      disabled={!templateName || isSavingTemplate}
                      onClick={handleSaveTemplate}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Template
                    </Button>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setImportStep('mapping')}
                    >
                      Back to Mapping
                    </Button>
                    <Button
                      onClick={handleApplyImport}
                      disabled={isApplying}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isApplying ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Apply Import to Application
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export to Fillable PDF</CardTitle>
              <CardDescription>
                Generate fillable PDF forms pre-populated with application data, or blank forms for offline completion.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExportPdf('blank');
                    }}
                    disabled={isExporting}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-1">Blank Fillable PDF</p>
                    <p className="text-sm text-muted-foreground">Download empty form for offline completion</p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleExportPdf('prefilled');
                    }}
                    disabled={isExporting}
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer transition-all hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-1">Pre-filled PDF</p>
                    <p className="text-sm text-muted-foreground">Download form with current application data</p>
                  </button>
                </div>

                <div className="border-t pt-6">
                  <Label className="text-sm font-medium mb-3 block">Select Form Type</Label>
                  <Select value={exportFormType} onValueChange={setExportFormType}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select a form type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sba-1919">SBA Form 1919 - Borrower Information</SelectItem>
                      <SelectItem value="sba-1920">SBA Form 1920 - Lender's Application</SelectItem>
                      <SelectItem value="sba-413">SBA Form 413 - Personal Financial Statement</SelectItem>
                      <SelectItem value="sba-912">SBA Form 912 - Statement of Personal History</SelectItem>
                      <SelectItem value="irs-4506t">IRS Form 4506-T - Request for Transcript</SelectItem>
                      <SelectItem value="sources-uses">Sources & Uses Statement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isExporting && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="ml-3 text-muted-foreground">Generating PDF...</span>
                  </div>
                )}

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <h4 className="font-medium mb-2">How it works:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>1. Select the form type you want to export</li>
                    <li>2. Choose blank (for offline completion) or pre-filled (with current data)</li>
                    <li>3. The PDF will download automatically</li>
                    <li>4. Fill out the form in any PDF reader (Adobe Acrobat, Preview, etc.)</li>
                    <li>5. Use the Import tab to upload the completed form back</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Saved Mapping Templates</CardTitle>
              <CardDescription>
                Reuse previously saved field mappings for faster imports of similar forms.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <List className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No templates saved yet</p>
                  <p className="text-sm">Templates will appear here after you save them during an import.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.mappings.length} field mappings &bull; Source: {template.sourceFormName}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setActiveTab('import');
                            applyTemplate(template);
                          }}
                        >
                          Use Template
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTemplate(template.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </BDOLayout>
  );
}
