'use client';

import { BDOLayout } from '@/components/layout/BDOLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';
import type { CREScope, ProjectTypeRule, RiskLevel, TriStateCondition } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Edit, FileQuestion, FileType, FileUp, Plus, Save, Settings, ShieldAlert, Tag, Trash2, Users, Wand2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AIPrompt {
  id: string;
  name: string;
  prompt: string;
  description?: string;
}

interface QuestionnaireRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  blockType: 'question' | 'ai-generated';
  mainCategory: 'Business Overview' | 'Project Purpose' | 'Industry';
  questionText?: string;
  aiBlockTemplateId?: string;
  purposeKey?: string;
  naicsCodes?: string[];
  questionOrder?: number;
}

interface AIBlockTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  inputFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'number';
    placeholder?: string;
    required: boolean;
  }>;
}

interface DefaultValues {
  wsjPrimeRate: number | null;
  dscrPeriod1: string;
  dscrPeriod2: string;
  dscrPeriod3: string;
  dscrPeriod4: string;
}

type FeeNameType =
  | 'Good Faith Deposit'
  | 'SBA Guarantee Fee'
  | 'Packaging Fee'
  | 'Appraisal Fee'
  | 'Environmental Fee'
  | 'Title Insurance'
  | 'Legal Fees';

interface FeeConfiguration {
  id: string;
  feeName: FeeNameType;
  amount: number;
  includesRealEstate: boolean;
  description: string;
  active: boolean;
}

interface FileUploadInstructions {
  businessApplicant?: string;
  individualApplicants?: string;
  otherBusinesses?: string;
  projectFiles?: string;
}

interface AdminSettings {
  aiPrompts: AIPrompt[];
  questionnaireRules: QuestionnaireRule[];
  aiBlockTemplates: AIBlockTemplate[];
  noteTags: string[];
  defaultValues: DefaultValues;
  projectTypeRules: ProjectTypeRule[];
  fileUploadInstructions?: FileUploadInstructions;
  feeConfigurations?: FeeConfiguration[];
}

interface AppUser {
  uid: string;
  email: string | null;
  role: string;
  displayName?: string | null;
  createdAt: Date;
}

const TEST_USERS: AppUser[] = [
  { uid: 'dev-srachal', email: 'srachal@tectonicfinancial.com', role: 'Admin', displayName: 'Shane Rachal', createdAt: new Date() },
  { uid: 'dev-user-2', email: 'jdoe@tectonicfinancial.com', role: 'BDO', displayName: 'Jane Doe', createdAt: new Date() },
];

const emptyRuleForm: Omit<QuestionnaireRule, 'id'> = {
  name: '',
  enabled: true,
  order: 0,
  blockType: 'question',
  mainCategory: 'Business Overview',
  questionText: '',
  aiBlockTemplateId: '',
  purposeKey: '',
  naicsCodes: [],
  questionOrder: 0,
};

const emptyTemplateForm: Omit<AIBlockTemplate, 'id'> = {
  name: '',
  description: '',
  prompt: '',
  inputFields: [],
};

const emptyProjectTypeRuleForm: Omit<ProjectTypeRule, 'id'> = {
  name: '',
  description: '',
  riskLevel: 'medium',
  isFallback: false,
  priority: 0,
  isStartup: 'any',
  hasExistingCashflow: 'any',
  hasTransitionRisk: 'any',
  includesRealEstate: 'any',
  creScope: 'any',
  isPartnerBuyout: 'any',
  involvesConstruction: 'any',
  includesDebtRefinance: 'any',
  debtRefinancePrimary: 'any',
};

const emptyFeeConfigurationForm: Omit<FeeConfiguration, 'id'> = {
  feeName: 'Good Faith Deposit',
  amount: 0,
  includesRealEstate: false,
  description: '',
  active: true,
};

const FEE_NAME_OPTIONS: FeeNameType[] = [
  'Good Faith Deposit',
  'SBA Guarantee Fee',
  'Packaging Fee',
  'Appraisal Fee',
  'Environmental Fee',
  'Title Insurance',
  'Legal Fees',
];

export default function AdminSettingsPage() {
  const router = useRouter();
  const { userInfo, isLoading } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState('default-values');
  const [settings, setSettings] = useState<AdminSettings>({
    aiPrompts: [
      {
        id: 'naics-suggestion',
        name: 'NAICS Code Suggestion',
        prompt: `Based on the industry "{industry}", suggest the top 3 most appropriate NAICS codes (6-digit codes).

Return a JSON object with a "suggestions" array containing exactly 3 objects, each with:
- code: the 6-digit NAICS code (as a string)
- title: the official NAICS title
- description: a brief explanation of why this code is appropriate for this industry

Example format:
{
  "suggestions": [
    {
      "code": "722511",
      "title": "Full-Service Restaurants",
      "description": "Fits businesses providing food services with wait staff"
    }
  ]
}`,
        description: 'System prompt for generating NAICS code suggestions',
      },
    ],
    questionnaireRules: [],
    aiBlockTemplates: [],
    noteTags: [],
    defaultValues: {
      wsjPrimeRate: null,
      dscrPeriod1: '',
      dscrPeriod2: '',
      dscrPeriod3: '',
      dscrPeriod4: '',
    },
    projectTypeRules: [],
    feeConfigurations: [],
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [appUsers, setAppUsers] = useState<AppUser[]>(TEST_USERS);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Questionnaire Rules table state
  const [rulesCategoryFilter, setRulesCategoryFilter] = useState<string>('All');
  const [rulesSortField, setRulesSortField] = useState<string>('questionOrder');
  const [rulesSortDir, setRulesSortDir] = useState<'asc' | 'desc'>('asc');

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Add User Modal State
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'BDO' as string,
  });

  // Questionnaire Rules Modal State
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QuestionnaireRule | null>(null);
  const [ruleForm, setRuleForm] = useState<Omit<QuestionnaireRule, 'id'>>(emptyRuleForm);

  // AI Block Templates Modal State
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AIBlockTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState<Omit<AIBlockTemplate, 'id'>>(emptyTemplateForm);

  // Project Type Rules Modal State
  const [projectTypeRuleModalOpen, setProjectTypeRuleModalOpen] = useState(false);
  const [editingProjectTypeRule, setEditingProjectTypeRule] = useState<ProjectTypeRule | null>(null);
  const [projectTypeRuleForm, setProjectTypeRuleForm] = useState<Omit<ProjectTypeRule, 'id'>>(emptyProjectTypeRuleForm);

  // Fee Configuration Modal State
  const [feeConfigModalOpen, setFeeConfigModalOpen] = useState(false);
  const [editingFeeConfig, setEditingFeeConfig] = useState<FeeConfiguration | null>(null);
  const [feeConfigForm, setFeeConfigForm] = useState<Omit<FeeConfiguration, 'id'>>(emptyFeeConfigurationForm);

  useEffect(() => {
    // Check if user is Admin
    if (!isLoading && userInfo) {
      if (userInfo.role !== 'Admin') {
        router.push('/bdo/projects');
      }
    }
  }, [userInfo, isLoading, router]);

  const loadAppUsers = () => {
    // No-op: users are managed in local state
  };

  const deleteAppUser = (uid: string, email: string | null) => {
    // Prevent deleting yourself
    if (uid === userInfo?.uid) {
      alert('You cannot delete your own account.');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete the user "${email || 'Unknown'}"?\n\nThis action cannot be undone.`
    );

    if (!confirmDelete) {
      return;
    }

    setIsDeletingUser(uid);
    setAppUsers((prev) => prev.filter((u) => u.uid !== uid));
    setIsDeletingUser(null);
    alert('User deleted successfully!');
  };

  const handleAddUser = () => {
    if (!newUserForm.email || !newUserForm.role) {
      alert('Email and Role are required.');
      return;
    }

    setIsAddingUser(true);

    // Create a unique ID for the new user
    const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create display name from first and last name
    const displayName = [newUserForm.firstName, newUserForm.lastName]
      .filter(Boolean)
      .join(' ') || null;

    const newUser: AppUser = {
      uid: newUserId,
      email: newUserForm.email,
      role: newUserForm.role,
      displayName,
      createdAt: new Date(),
    };

    setAppUsers((prev) => [newUser, ...prev]);

    // Reset form and close modal
    setNewUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'BDO',
    });
    setAddUserModalOpen(false);
    setIsAddingUser(false);

    alert('User added successfully!');
  };

  const saveSettings = () => {
    setIsSaving(true);
    setHasUnsavedChanges(false);
    console.log('Settings saved (local state only):', settings);
    alert('Settings saved successfully!');
    setIsSaving(false);
  };

  // AI Prompts handlers
  const addAIPrompt = () => {
    const newPrompt: AIPrompt = {
      id: `prompt-${Date.now()}`,
      name: 'New Prompt',
      prompt: '',
      description: '',
    };
    setSettings({
      ...settings,
      aiPrompts: [...settings.aiPrompts, newPrompt],
    });
    setHasUnsavedChanges(true);
  };

  const updateAIPrompt = (id: string, updates: Partial<AIPrompt>) => {
    setSettings({
      ...settings,
      aiPrompts: settings.aiPrompts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    });
    setHasUnsavedChanges(true);
  };

  const deleteAIPrompt = (id: string) => {
    if (confirm('Are you sure you want to delete this prompt?')) {
      setSettings({
        ...settings,
        aiPrompts: settings.aiPrompts.filter((p) => p.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Questionnaire Rules handlers
  const openRuleModal = (rule?: QuestionnaireRule) => {
    if (rule) {
      setEditingRule(rule);
      setRuleForm({
        name: rule.name,
        enabled: rule.enabled,
        order: rule.order,
        blockType: rule.blockType,
        mainCategory: rule.mainCategory || 'Business Overview',
        questionText: rule.questionText || '',
        aiBlockTemplateId: rule.aiBlockTemplateId || '',
        purposeKey: rule.purposeKey || '',
        naicsCodes: rule.naicsCodes || [],
        questionOrder: rule.questionOrder || 0,
      });
    } else {
      setEditingRule(null);
      setRuleForm(emptyRuleForm);
    }
    setRuleModalOpen(true);
  };

  const handleRuleSubmit = () => {
    if (!ruleForm.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (!ruleForm.mainCategory) {
      alert('Please select a main category');
      return;
    }

    if (ruleForm.blockType === 'question' && !ruleForm.questionText?.trim()) {
      alert('Please enter question text');
      return;
    }

    if (ruleForm.blockType === 'ai-generated' && !ruleForm.aiBlockTemplateId) {
      alert('Please select an AI template');
      return;
    }

    if (editingRule) {
      // Update existing rule
      setSettings({
        ...settings,
        questionnaireRules: settings.questionnaireRules.map((r) =>
          r.id === editingRule.id ? { ...ruleForm, id: editingRule.id } : r
        ),
      });
    } else {
      // Create new rule
      const newRule: QuestionnaireRule = {
        ...ruleForm,
        id: `rule-${Date.now()}`,
      };
      setSettings({
        ...settings,
        questionnaireRules: [...settings.questionnaireRules, newRule],
      });
    }

    setHasUnsavedChanges(true);
    setRuleModalOpen(false);
    setEditingRule(null);
    setRuleForm(emptyRuleForm);
  };

  const deleteQuestionnaireRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      setSettings({
        ...settings,
        questionnaireRules: settings.questionnaireRules.filter((r) => r.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };


  // AI Block Templates handlers
  const openTemplateModal = (template?: AIBlockTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        name: template.name,
        description: template.description,
        prompt: template.prompt,
        inputFields: template.inputFields,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm(emptyTemplateForm);
    }
    setTemplateModalOpen(true);
  };

  const handleTemplateSubmit = () => {
    if (!templateForm.name.trim()) {
      alert('Please enter a template name');
      return;
    }

    if (!templateForm.description.trim()) {
      alert('Please enter a template description');
      return;
    }

    if (!templateForm.prompt.trim()) {
      alert('Please enter a prompt template');
      return;
    }

    if (editingTemplate) {
      // Update existing template
      setSettings({
        ...settings,
        aiBlockTemplates: settings.aiBlockTemplates.map((t) =>
          t.id === editingTemplate.id ? { ...templateForm, id: editingTemplate.id } : t
        ),
      });
    } else {
      // Create new template
      const newTemplate: AIBlockTemplate = {
        ...templateForm,
        id: `template-${Date.now()}`,
      };
      setSettings({
        ...settings,
        aiBlockTemplates: [...settings.aiBlockTemplates, newTemplate],
      });
    }

    setHasUnsavedChanges(true);
    setTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
  };

  const deleteAIBlockTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setSettings({
        ...settings,
        aiBlockTemplates: settings.aiBlockTemplates.filter((t) => t.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  const addInputField = () => {
    setTemplateForm({
      ...templateForm,
      inputFields: [
        ...templateForm.inputFields,
        { name: '', label: '', type: 'text', placeholder: '', required: false },
      ],
    });
  };

  const updateInputField = (index: number, updates: Partial<AIBlockTemplate['inputFields'][0]>) => {
    const newFields = [...templateForm.inputFields];
    newFields[index] = { ...newFields[index], ...updates };
    setTemplateForm({ ...templateForm, inputFields: newFields });
  };

  const removeInputField = (index: number) => {
    setTemplateForm({
      ...templateForm,
      inputFields: templateForm.inputFields.filter((_, i) => i !== index),
    });
  };

  // Note Tags handlers
  const addNoteTag = () => {
    const trimmedTag = newTagInput.trim();
    if (!trimmedTag) {
      alert('Please enter a tag name');
      return;
    }
    if (settings.noteTags.includes(trimmedTag)) {
      alert('This tag already exists');
      return;
    }
    setSettings({
      ...settings,
      noteTags: [...settings.noteTags, trimmedTag],
    });
    setNewTagInput('');
    setHasUnsavedChanges(true);
  };

  const deleteNoteTag = (tagToDelete: string) => {
    if (confirm(`Are you sure you want to delete the tag "${tagToDelete}"?`)) {
      setSettings({
        ...settings,
        noteTags: settings.noteTags.filter((tag) => tag !== tagToDelete),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Project Type Rules handlers
  const openProjectTypeRuleModal = (rule?: ProjectTypeRule) => {
    if (rule) {
      setEditingProjectTypeRule(rule);
      setProjectTypeRuleForm({
        name: rule.name,
        description: rule.description || '',
        riskLevel: rule.riskLevel,
        isFallback: rule.isFallback,
        priority: rule.priority ?? ((rule as unknown as {order?: number}).order) ?? 0,
        isStartup: rule.isStartup,
        hasExistingCashflow: rule.hasExistingCashflow,
        hasTransitionRisk: rule.hasTransitionRisk,
        includesRealEstate: rule.includesRealEstate,
        creScope: rule.creScope,
        isPartnerBuyout: rule.isPartnerBuyout,
        involvesConstruction: rule.involvesConstruction,
        includesDebtRefinance: rule.includesDebtRefinance ?? 'any',
        debtRefinancePrimary: rule.debtRefinancePrimary ?? 'any',
      });
    } else {
      setEditingProjectTypeRule(null);
      const nextPriority = settings.projectTypeRules.length > 0
        ? Math.max(...settings.projectTypeRules.map(r => r.priority ?? ((r as unknown as {order?: number}).order) ?? 0)) + 1
        : 1;
      setProjectTypeRuleForm({ ...emptyProjectTypeRuleForm, priority: nextPriority });
    }
    setProjectTypeRuleModalOpen(true);
  };

  const handleProjectTypeRuleSubmit = () => {
    if (!projectTypeRuleForm.name.trim()) {
      alert('Please enter a rule name');
      return;
    }

    if (editingProjectTypeRule) {
      // Update existing rule
      setSettings({
        ...settings,
        projectTypeRules: settings.projectTypeRules.map((r) =>
          r.id === editingProjectTypeRule.id ? { ...projectTypeRuleForm, id: editingProjectTypeRule.id } : r
        ),
      });
    } else {
      // Create new rule
      const newRule: ProjectTypeRule = {
        ...projectTypeRuleForm,
        id: `project-type-rule-${Date.now()}`,
      };
      setSettings({
        ...settings,
        projectTypeRules: [...settings.projectTypeRules, newRule],
      });
    }

    setHasUnsavedChanges(true);
    setProjectTypeRuleModalOpen(false);
    setEditingProjectTypeRule(null);
    setProjectTypeRuleForm(emptyProjectTypeRuleForm);
  };

  const deleteProjectTypeRule = (id: string) => {
    if (confirm('Are you sure you want to delete this project type rule?')) {
      setSettings({
        ...settings,
        projectTypeRules: settings.projectTypeRules.filter((r) => r.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  const handleImportRiskAssessmentRules = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text);

        if (!Array.isArray(imported)) {
          alert('Invalid file format. Expected a JSON array of rules.');
          return;
        }

        // Convert string yes/no to boolean TriStateCondition
        const convertCondition = (val: string | boolean | undefined): TriStateCondition => {
          if (val === 'yes' || val === true) return true;
          if (val === 'no' || val === false) return false;
          return 'any';
        };

        const convertCreScope = (val: string | undefined): CREScope => {
          if (val === 'purchase') return 'purchase';
          if (val === 'improvement') return 'improvement';
          return 'any';
        };

        const existingIds = new Set(settings.projectTypeRules.map(r => r.id));
        const existingNames = new Set(settings.projectTypeRules.map(r => r.name.toLowerCase()));

        const newRules: ProjectTypeRule[] = [];
        let skipped = 0;

        for (let i = 0; i < imported.length; i++) {
          const raw = imported[i];

          // Skip duplicates by id or name
          if (existingIds.has(raw.id) || existingNames.has((raw.name || '').toLowerCase())) {
            skipped++;
            continue;
          }

          const basePriority = settings.projectTypeRules.length > 0
            ? Math.max(...settings.projectTypeRules.map(r => r.priority ?? 0)) + 1
            : 1;

          newRules.push({
            id: raw.id || `imported-rule-${Date.now()}-${i}`,
            name: raw.name || `Imported Rule ${i + 1}`,
            description: raw.description || '',
            riskLevel: raw.riskLevel || 'medium',
            isFallback: raw.isFallback ?? false,
            priority: raw.priority ?? (basePriority + i),
            isStartup: convertCondition(raw.isStartup),
            hasExistingCashflow: convertCondition(raw.hasExistingCashflow),
            hasTransitionRisk: convertCondition(raw.hasTransitionRisk),
            includesRealEstate: convertCondition(raw.includesRealEstate),
            creScope: convertCreScope(raw.creScope),
            isPartnerBuyout: convertCondition(raw.isPartnerBuyout),
            involvesConstruction: convertCondition(raw.involvesConstruction),
            includesDebtRefinance: convertCondition(raw.includesDebtRefinance),
            debtRefinancePrimary: convertCondition(raw.debtRefinancePrimary),
          });
        }

        if (newRules.length === 0) {
          alert(`No new rules to import. ${skipped > 0 ? `${skipped} rule(s) already exist.` : ''}`);
          return;
        }

        const msg = skipped > 0
          ? `Import ${newRules.length} new rule(s)? (${skipped} duplicate(s) will be skipped)`
          : `Import ${newRules.length} rule(s)?`;

        if (!confirm(msg + '\n\nDon\'t forget to save after importing.')) return;

        setSettings({
          ...settings,
          projectTypeRules: [...settings.projectTypeRules, ...newRules],
        });
        setHasUnsavedChanges(true);
        alert(`Successfully imported ${newRules.length} rule(s). Don't forget to save your changes.`);
      } catch (err: any) {
        console.error('Error importing rules:', err);
        alert('Error reading file: ' + err.message);
      }
    };
    input.click();
  };

  // Fee Configuration handlers
  const openFeeConfigModal = (feeConfig?: FeeConfiguration) => {
    if (feeConfig) {
      setEditingFeeConfig(feeConfig);
      setFeeConfigForm({
        feeName: feeConfig.feeName,
        amount: feeConfig.amount,
        includesRealEstate: feeConfig.includesRealEstate,
        description: feeConfig.description,
        active: feeConfig.active,
      });
    } else {
      setEditingFeeConfig(null);
      setFeeConfigForm(emptyFeeConfigurationForm);
    }
    setFeeConfigModalOpen(true);
  };

  const handleFeeConfigSubmit = () => {
    if (!feeConfigForm.feeName) {
      alert('Please select a fee name');
      return;
    }
    if (feeConfigForm.amount <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }

    if (editingFeeConfig) {
      // Update existing fee configuration
      setSettings({
        ...settings,
        feeConfigurations: (settings.feeConfigurations || []).map((fc) =>
          fc.id === editingFeeConfig.id ? { ...feeConfigForm, id: editingFeeConfig.id } : fc
        ),
      });
    } else {
      // Create new fee configuration
      const newFeeConfig: FeeConfiguration = {
        ...feeConfigForm,
        id: `fee-config-${Date.now()}`,
      };
      setSettings({
        ...settings,
        feeConfigurations: [...(settings.feeConfigurations || []), newFeeConfig],
      });
    }

    setHasUnsavedChanges(true);
    setFeeConfigModalOpen(false);
    setEditingFeeConfig(null);
    setFeeConfigForm(emptyFeeConfigurationForm);
  };

  const deleteFeeConfig = (id: string) => {
    if (confirm('Are you sure you want to delete this fee configuration?')) {
      setSettings({
        ...settings,
        feeConfigurations: (settings.feeConfigurations || []).filter((fc) => fc.id !== id),
      });
      setHasUnsavedChanges(true);
    }
  };

  // Helper function for condition badges
  const getConditionBadge = (condition: TriStateCondition | CREScope, label: string) => {
    if (condition === 'any') return null;
    const isYes = condition === true || condition === 'purchase' || condition === 'improvement';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        isYes ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {label}: {typeof condition === 'boolean' ? (condition ? 'Yes' : 'No') : condition}
      </span>
    );
  };

  if (isLoading || isLoadingSettings) {
    return (
      <BDOLayout title="Admin Settings">
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-accent)] border-t-transparent rounded-full"></div>
            <p className="text-[color:var(--t-color-text-muted)] mt-4">Loading admin settings...</p>
          </div>
        </div>
      </BDOLayout>
    );
  }

  if (userInfo?.role !== 'Admin') {
    return null;
  }

  return (
    <BDOLayout title="Admin Settings">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[color:var(--t-color-primary)] mb-1" data-testid="text-admin-title">
            Admin Settings
          </h1>
          <p className="text-sm text-[color:var(--t-color-text-secondary)]">
            Configure default inputs, AI prompts, questionnaire rules, and AI block templates.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                !isSaving
                  ? 'bg-[var(--t-color-primary)] text-white hover-elevate active-elevate-2'
                  : 'bg-[var(--t-color-border)] text-[color:var(--t-color-text-muted)] cursor-not-allowed'
              }`}
              data-testid="button-save-settings"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="default-values" data-testid="tab-default-inputs">Default Inputs</TabsTrigger>
          <TabsTrigger value="ai-prompts" data-testid="tab-ai-prompts">AI Prompts</TabsTrigger>
          <TabsTrigger value="questionnaire-rules" data-testid="tab-questionnaire-rules">Questionnaire Rules</TabsTrigger>
          <TabsTrigger value="ai-block-templates" data-testid="tab-ai-templates">AI Block Templates</TabsTrigger>
          <TabsTrigger value="note-tags" data-testid="tab-note-tags">Note Tags</TabsTrigger>
          <TabsTrigger value="file-upload-instructions" data-testid="tab-file-upload-instructions">File Upload Instructions</TabsTrigger>
          <TabsTrigger value="project-type-rules" data-testid="tab-project-type-rules">Risk Assessment</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">User Management</TabsTrigger>
        </TabsList>

        {/* Default Values Tab */}
        <TabsContent value="default-values" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-wsj-prime-rate-title">
                WSJ Prime Rate
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                Set the default Wall Street Journal Prime Rate (percentage with two decimal places). This value will be used on the Funding Structure page.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wsj-prime-rate" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                WSJ Prime Rate (%)
              </Label>
              <Input
                id="wsj-prime-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="8.50"
                value={settings.defaultValues?.wsjPrimeRate ?? ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? null : parseFloat(e.target.value);
                  setSettings({
                    ...settings,
                    defaultValues: { ...settings.defaultValues, wsjPrimeRate: value } as DefaultValues,
                  });
                  setHasUnsavedChanges(true);
                }}
                className="max-w-xs"
                data-testid="input-wsj-prime-rate"
              />
            </div>
          </div>

          {/* Fee Configurations */}
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">Fee Configurations</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Define fee amounts based on loan conditions. The system will auto-populate fees in Proposal Letters based on BDO answers in Risk Assessment.
                </p>
              </div>
              <Button onClick={() => openFeeConfigModal()} data-testid="button-add-fee-config">
                <Plus className="w-4 h-4 mr-2" />
                Add Fee
              </Button>
            </div>

            {(!settings.feeConfigurations || settings.feeConfigurations.length === 0) ? (
              <div className="text-center py-8 bg-[var(--t-color-page-bg)] rounded-lg border border-dashed border-[var(--t-color-border)]">
                <p className="text-[color:var(--t-color-text-muted)] mb-3">No fee configurations yet.</p>
                <Button onClick={() => openFeeConfigModal()} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Fee
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--t-color-page-bg)] border-b border-[var(--t-color-border)]">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Fee Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Amount</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Condition</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Status</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings.feeConfigurations.map((feeConfig) => (
                      <tr key={feeConfig.id} className="border-b border-[var(--t-color-border)] hover:bg-[var(--t-color-page-bg)]" data-testid={`row-fee-config-${feeConfig.id}`}>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-body)]">{feeConfig.feeName}</td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">${feeConfig.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={feeConfig.includesRealEstate ? 'default' : 'secondary'}>
                            Real Estate: {feeConfig.includesRealEstate ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={feeConfig.active ? 'default' : 'secondary'}>
                            {feeConfig.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openFeeConfigModal(feeConfig)} data-testid={`button-edit-fee-config-${feeConfig.id}`}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteFeeConfig(feeConfig.id)} data-testid={`button-delete-fee-config-${feeConfig.id}`}>
                              <Trash2 className="w-4 h-4 text-[color:var(--t-color-danger-text)]" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* DSCR Default Periods */}
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-dscr-periods-title">
                DSCR Default Periods
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                Set the default periods for the DSCR (Debt Service Coverage Ratio) section at the bottom of the Funding Structure page.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dscr-period-1" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 1
                </Label>
                      <Select
                        value={settings.defaultValues?.dscrPeriod1 || ''}
                        onValueChange={(value) => {
                          setSettings({
                            ...settings,
                            defaultValues: { ...settings.defaultValues, dscrPeriod1: value } as DefaultValues,
                          });
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <SelectTrigger id="dscr-period-1" data-testid="select-dscr-period-1">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="Interim">Interim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="dscr-period-2" className="text-xs text-muted-foreground mb-1 block">
                        Period 2
                      </Label>
                      <Select
                        value={settings.defaultValues?.dscrPeriod2 || ''}
                        onValueChange={(value) => {
                          setSettings({
                            ...settings,
                            defaultValues: { ...settings.defaultValues, dscrPeriod2: value } as DefaultValues,
                          });
                          setHasUnsavedChanges(true);
                        }}
                      >
                        <SelectTrigger id="dscr-period-2" data-testid="select-dscr-period-2">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2022">2022</SelectItem>
                          <SelectItem value="2023">2023</SelectItem>
                          <SelectItem value="2024">2024</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                          <SelectItem value="Interim">Interim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
              <div className="space-y-2">
                <Label htmlFor="dscr-period-3" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 3
                </Label>
                <Select
                  value={settings.defaultValues?.dscrPeriod3 || ''}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      defaultValues: { ...settings.defaultValues, dscrPeriod3: value } as DefaultValues,
                    });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="dscr-period-3" data-testid="select-dscr-period-3">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dscr-period-4" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  DSCR Period 4
                </Label>
                <Select
                  value={settings.defaultValues?.dscrPeriod4 || ''}
                  onValueChange={(value) => {
                    setSettings({
                      ...settings,
                      defaultValues: { ...settings.defaultValues, dscrPeriod4: value } as DefaultValues,
                    });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="dscr-period-4" data-testid="select-dscr-period-4">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2022">2022</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="Interim">Interim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* AI Prompts Tab */}
        <TabsContent value="ai-prompts" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-naics-prompt-title">
                NAICS Code Suggestion Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This prompt is used to generate NAICS code suggestions based on the industry.
                Use <code className="bg-[var(--t-color-input-bg)] px-2 py-1 rounded text-sm">{'{industry}'}</code> as a placeholder for the industry name.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'naics-suggestion')?.prompt || settings.aiPrompts[0]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'naics-suggestion') || settings.aiPrompts[0];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[300px] font-mono text-sm"
              placeholder="Enter the NAICS prompt template..."
              data-testid="textarea-naics-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Available placeholders:</strong> {'{industry}'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-business-description-title">
                Business Description Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This prompt is used to generate comprehensive business descriptions for SBA loan applications.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'business-description')?.prompt || settings.aiPrompts[1]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'business-description') || settings.aiPrompts[1];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[400px] font-mono text-sm"
              placeholder="Enter the business description prompt template..."
              data-testid="textarea-business-description-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Available placeholders:</strong> {'{legalName}'}, {'{industry}'}, {'{naicsCode}'}, {'{yearsInOperation}'}, {'{employees}'}, {'{annualRevenue}'}, {'{description}'}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-financial-spread-prompt-title">
                Financial Spread Analysis Prompt
              </h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                This system prompt is sent to Claude when analyzing financial spreads. It controls how the AI evaluates income statements, calculates DSCR trends, assigns repayment scores, and structures its response. Leave empty to use the built-in default prompt.
              </p>
            </div>
            <Textarea
              value={settings.aiPrompts.find(p => p.id === 'financial-spread')?.prompt || settings.aiPrompts[2]?.prompt || ''}
              onChange={(e) => {
                const target = settings.aiPrompts.find(p => p.id === 'financial-spread') || settings.aiPrompts[2];
                if (target) {
                  updateAIPrompt(target.id, { prompt: e.target.value });
                }
              }}
              className="w-full min-h-[500px] font-mono text-sm"
              placeholder="Leave empty to use the default financial analysis prompt. Paste a custom prompt here to override it."
              data-testid="textarea-financial-spread-prompt"
            />
            <div className="mt-3 text-sm text-[color:var(--t-color-text-muted)]">
              <strong>Note:</strong> The prompt receives structured JSON financial period data as user input. The response must be valid JSON matching the expected analysis schema. Modifying the response format may break the analysis display.
            </div>
          </div>
        </TabsContent>

        {/* Questionnaire Rules Tab */}
        <TabsContent value="questionnaire-rules" className="space-y-4">
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)]">Questionnaire Rules</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <Button onClick={() => openRuleModal()} data-testid="button-add-rule">
                <Plus className="w-4 h-4 mr-2" />
                Add Rule
              </Button>
            </div>
          </div>

          <div className="flex gap-1 flex-wrap">
            {['All', 'Business Overview', 'Project Purpose', 'Industry'].map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={rulesCategoryFilter === cat ? 'default' : 'outline'}
                onClick={() => setRulesCategoryFilter(cat)}
                data-testid={`button-filter-${cat.toLowerCase().replace(/\s/g, '-')}`}
              >
                {cat}
                <span className="ml-1 opacity-70">
                  ({cat === 'All'
                    ? settings.questionnaireRules.length
                    : settings.questionnaireRules.filter(r => r.mainCategory === cat).length})
                </span>
              </Button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-[var(--t-color-border)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <span className="text-xs">On</span>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'name') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('name');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-name"
                    >
                      Name {rulesSortField === 'name' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'blockType') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('blockType');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-blocktype"
                    >
                      Type {rulesSortField === 'blockType' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'mainCategory') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('mainCategory');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-category"
                    >
                      Category {rulesSortField === 'mainCategory' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs font-medium">Trigger</span>
                  </TableHead>
                  <TableHead>
                    <button
                      className="flex items-center text-xs font-medium"
                      onClick={() => {
                        if (rulesSortField === 'questionOrder') {
                          setRulesSortDir(rulesSortDir === 'asc' ? 'desc' : 'asc');
                        } else {
                          setRulesSortField('questionOrder');
                          setRulesSortDir('asc');
                        }
                      }}
                      data-testid="button-sort-order"
                    >
                      Order {rulesSortField === 'questionOrder' ? (rulesSortDir === 'asc' ? '\u25B2' : '\u25BC') : ''}
                    </button>
                  </TableHead>
                  <TableHead className="w-[80px] text-right">
                    <span className="text-xs font-medium">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settings.questionnaireRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-[color:var(--t-color-text-muted)]">
                      No questionnaire rules yet. Add your first rule or import seed rules.
                    </TableCell>
                  </TableRow>
                )}
                {(() => {
                  const filtered = rulesCategoryFilter === 'All'
                    ? settings.questionnaireRules
                    : settings.questionnaireRules.filter(r => r.mainCategory === rulesCategoryFilter);
                  const sorted = [...filtered].sort((a, b) => {
                    const aVal = (a as any)[rulesSortField] ?? 0;
                    const bVal = (b as any)[rulesSortField] ?? 0;
                    if (typeof aVal === 'string' && typeof bVal === 'string') {
                      return rulesSortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                    }
                    return rulesSortDir === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
                  });
                  return sorted.map((rule) => (
                    <TableRow key={rule.id} className={!rule.enabled ? 'opacity-50' : ''} data-testid={`rule-row-${rule.id}`}>
                      <TableCell>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            setSettings({
                              ...settings,
                              questionnaireRules: settings.questionnaireRules.map((r) =>
                                r.id === rule.id ? { ...r, enabled: checked } : r
                              ),
                            });
                            setHasUnsavedChanges(true);
                          }}
                          data-testid={`switch-rule-enabled-${rule.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium text-sm text-[color:var(--t-color-text-body)]" data-testid={`text-rule-name-${rule.id}`}>
                            {rule.name}
                          </span>
                          {rule.blockType === 'question' && rule.questionText && (
                            <p className="text-xs text-[color:var(--t-color-text-muted)] mt-0.5 line-clamp-1" data-testid={`text-rule-question-${rule.id}`}>
                              {rule.questionText}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-rule-type-${rule.id}`}>
                          {rule.blockType === 'question' ? 'Question' : 'AI'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[color:var(--t-color-text-body)]" data-testid={`text-rule-category-${rule.id}`}>
                          {rule.mainCategory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-[color:var(--t-color-text-muted)]">
                          {rule.mainCategory === 'Project Purpose' && rule.purposeKey
                            ? rule.purposeKey
                            : rule.mainCategory === 'Industry' && rule.naicsCodes?.length
                              ? `NAICS: ${rule.naicsCodes.join(', ')}`
                              : '\u2014'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-[color:var(--t-color-text-body)]">{rule.questionOrder || rule.order}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openRuleModal(rule)} data-testid={`button-edit-rule-${rule.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestionnaireRule(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Rule Modal */}
        <Dialog open={ruleModalOpen} onOpenChange={setRuleModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-rule-form">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Rule' : 'Add New Rule'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="rule-name">Name *</Label>
                <Input
                  id="rule-name"
                  value={ruleForm.name}
                  onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                  placeholder="Enter rule name"
                  data-testid="input-rule-name"
                />
              </div>

              <div>
                <Label>Block Type *</Label>
                <RadioGroup
                  value={ruleForm.blockType}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, blockType: value as 'question' | 'ai-generated' })}
                  data-testid="radio-rule-block-type"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="question" id="block-question" data-testid="radio-block-type-question" />
                    <Label htmlFor="block-question">Question</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ai-generated" id="block-ai" data-testid="radio-block-type-ai-generated" />
                    <Label htmlFor="block-ai">AI Generated</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="main-category">Main Category *</Label>
                <Select
                  value={ruleForm.mainCategory}
                  onValueChange={(value) => setRuleForm({ ...ruleForm, mainCategory: value as 'Business Overview' | 'Project Purpose' | 'Industry' })}
                >
                  <SelectTrigger id="main-category" data-testid="select-main-category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Business Overview">Business Overview</SelectItem>
                    <SelectItem value="Project Purpose">Project Purpose</SelectItem>
                    <SelectItem value="Industry">Industry</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ruleForm.blockType === 'question' && (
                <div>
                  <Label htmlFor="question-text">Question Text *</Label>
                  <Textarea
                    id="question-text"
                    value={ruleForm.questionText}
                    onChange={(e) => setRuleForm({ ...ruleForm, questionText: e.target.value })}
                    placeholder="Enter the question to display"
                    className="min-h-[100px]"
                    data-testid="textarea-question-text"
                  />
                </div>
              )}

              {ruleForm.blockType === 'ai-generated' && (
                <div>
                  <Label htmlFor="template-select">AI Block Template *</Label>
                  <Select
                    value={ruleForm.aiBlockTemplateId}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, aiBlockTemplateId: value })}
                  >
                    <SelectTrigger id="template-select" data-testid="select-ai-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.aiBlockTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rule-order">Order</Label>
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Global display order</p>
                  <Input
                    id="rule-order"
                    type="number"
                    value={ruleForm.order}
                    onChange={(e) => setRuleForm({ ...ruleForm, order: parseInt(e.target.value) || 0 })}
                    data-testid="input-rule-order"
                  />
                </div>
                <div>
                  <Label htmlFor="rule-question-order">Question Order (within group)</Label>
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Order within category group</p>
                  <Input
                    id="rule-question-order"
                    type="number"
                    value={ruleForm.questionOrder || 0}
                    onChange={(e) => setRuleForm({ ...ruleForm, questionOrder: parseInt(e.target.value) || 0 })}
                    data-testid="input-rule-question-order"
                  />
                </div>
              </div>

              {ruleForm.mainCategory === 'Project Purpose' && (
                <div>
                  <Label htmlFor="rule-purpose-key">Purpose Key</Label>
                  <Select
                    value={ruleForm.purposeKey || ''}
                    onValueChange={(value) => setRuleForm({ ...ruleForm, purposeKey: value || '' })}
                  >
                    <SelectTrigger id="rule-purpose-key" data-testid="select-purpose-key">
                      <SelectValue placeholder="Select a purpose key" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Business Acquisition / Change of Ownership">Business Acquisition / Change of Ownership</SelectItem>
                      <SelectItem value="Commercial Real Estate: Construction">CRE: Construction</SelectItem>
                      <SelectItem value="Commercial Real Estate: Improvements">CRE: Improvements</SelectItem>
                      <SelectItem value="Commercial Real Estate: Purchase">CRE: Purchase</SelectItem>
                      <SelectItem value="Debt Refinance">Debt Refinance</SelectItem>
                      <SelectItem value="Equipment Acquisition / Installation">Equipment Acquisition / Installation</SelectItem>
                      <SelectItem value="Existing Business">Existing Business</SelectItem>
                      <SelectItem value="Expansion">Expansion</SelectItem>
                      <SelectItem value="Franchise">Franchise</SelectItem>
                      <SelectItem value="Inventory Acquisition">Inventory Acquisition</SelectItem>
                      <SelectItem value="Partner Buyout">Partner Buyout</SelectItem>
                      <SelectItem value="Start Up">Start Up</SelectItem>
                      <SelectItem value="Transition Risk">Transition Risk</SelectItem>
                      <SelectItem value="Working Capital">Working Capital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {ruleForm.mainCategory === 'Industry' && (
                <div>
                  <Label htmlFor="rule-naics-codes">NAICS Codes (comma-separated prefixes)</Label>
                  <Input
                    id="rule-naics-codes"
                    value={(ruleForm.naicsCodes || []).join(', ')}
                    onChange={(e) => setRuleForm({
                      ...ruleForm,
                      naicsCodes: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                    placeholder="e.g., 44, 45"
                    data-testid="input-naics-codes"
                  />
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1">NAICS code prefixes that this rule applies to</p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="rule-enabled"
                  checked={ruleForm.enabled}
                  onCheckedChange={(checked) => setRuleForm({ ...ruleForm, enabled: checked })}
                  data-testid="switch-rule-enabled"
                />
                <Label htmlFor="rule-enabled">Enabled</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleModalOpen(false)} data-testid="button-cancel-rule">
                Cancel
              </Button>
              <Button
                onClick={handleRuleSubmit}
                data-testid="button-submit-rule"
              >
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Template Modal */}
        <Dialog open={templateModalOpen} onOpenChange={setTemplateModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-template-form">
            <DialogHeader>
              <DialogTitle>{editingTemplate ? 'Edit Template' : 'Add New Template'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div>
                <Label htmlFor="template-name">Name *</Label>
                <Input
                  id="template-name"
                  value={templateForm.name}
                  onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  placeholder="Enter template name"
                  data-testid="input-template-name"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description *</Label>
                <Textarea
                  id="template-description"
                  value={templateForm.description}
                  onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  placeholder="Enter template description"
                  className="min-h-[80px]"
                  data-testid="textarea-template-description"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label>Input Fields</Label>
                  <Button variant="outline" size="sm" onClick={addInputField} data-testid="button-add-input-field">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-3">
                  {templateForm.inputFields.length === 0 ? (
                    <p className="text-sm text-[color:var(--t-color-text-muted)] text-center py-4">
                      No input fields yet. Add fields to collect data for AI generation.
                    </p>
                  ) : (
                    templateForm.inputFields.map((field, index) => (
                      <div key={index} className="flex gap-2 items-start p-3 border rounded-lg" data-testid={`input-field-${index}`}>
                        <div className="flex-1 grid grid-cols-4 gap-2">
                          <div>
                            <Input
                              value={field.name}
                              onChange={(e) => updateInputField(index, { name: e.target.value })}
                              placeholder="Field name"
                              data-testid={`input-field-name-${index}`}
                            />
                          </div>
                          <div>
                            <Input
                              value={field.label}
                              onChange={(e) => updateInputField(index, { label: e.target.value })}
                              placeholder="Label"
                              data-testid={`input-field-label-${index}`}
                            />
                          </div>
                          <div>
                            <Select
                              value={field.type}
                              onValueChange={(value) => updateInputField(index, { type: value as 'text' | 'textarea' | 'number' })}
                            >
                              <SelectTrigger data-testid={`select-field-type-${index}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Textarea</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-sm">
                              <input
                                type="checkbox"
                                checked={field.required}
                                onChange={(e) => updateInputField(index, { required: e.target.checked })}
                                className="w-4 h-4"
                                data-testid={`checkbox-field-required-${index}`}
                              />
                              Required
                            </label>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeInputField(index)}
                          data-testid={`button-remove-field-${index}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="prompt-template">Prompt Template *</Label>
                <Textarea
                  id="prompt-template"
                  value={templateForm.prompt}
                  onChange={(e) => setTemplateForm({ ...templateForm, prompt: e.target.value })}
                  placeholder="Enter the AI prompt template. Use {fieldName} for placeholders that match input field names."
                  className="min-h-[150px] font-mono text-sm"
                  data-testid="textarea-prompt-template"
                />
                <p className="text-sm text-[color:var(--t-color-text-muted)] mt-2">
                  Use placeholders like {'{fieldName}'} to reference input field values in the prompt.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setTemplateModalOpen(false)} data-testid="button-cancel-template">
                Cancel
              </Button>
              <Button
                onClick={handleTemplateSubmit}
                data-testid="button-submit-template"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Project Type Rules Tab */}
        <TabsContent value="project-type-rules" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid="text-project-type-rules-title">Risk Assessment Rules</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Configure project types and risk levels that are automatically assigned based on BDO answers to classification questions.
                  Rules are evaluated by priority (lowest number first), and the first matching rule determines the project type and risk level.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleImportRiskAssessmentRules} variant="outline" data-testid="button-import-risk-rules">
                  <FileUp className="w-4 h-4 mr-2" />
                  Import Rules
                </Button>
                <Button onClick={() => openProjectTypeRuleModal()} data-testid="button-add-project-type-rule">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project Type
                </Button>
              </div>
            </div>

            {settings.projectTypeRules.length > 0 ? (
              <div className="space-y-4">
                {settings.projectTypeRules
                  .sort((a, b) => (a.priority ?? ((a as unknown as {order?: number}).order) ?? 0) - (b.priority ?? ((b as unknown as {order?: number}).order) ?? 0))
                  .map((rule) => (
                    <div
                      key={rule.id}
                      className={`border rounded-lg p-4 ${rule.isFallback ? 'border-amber-300 bg-amber-50' : 'border-[var(--t-color-border)]'}`}
                      data-testid={`project-type-rule-${rule.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm text-[color:var(--t-color-text-muted)]">P{rule.priority ?? ((rule as unknown as {order?: number}).order) ?? 0}</span>
                            <h3 className="font-semibold text-[color:var(--t-color-text-body)]" data-testid={`text-rule-name-${rule.id}`}>{rule.name}</h3>
                            {rule.isFallback && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Fallback</Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={
                                rule.riskLevel === 'low'
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : rule.riskLevel === 'low-medium'
                                  ? 'bg-lime-100 text-lime-800 border-lime-300'
                                  : rule.riskLevel === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : rule.riskLevel === 'medium-high'
                                  ? 'bg-orange-100 text-orange-800 border-orange-300'
                                  : rule.riskLevel === 'high'
                                  ? 'bg-red-100 text-red-800 border-red-300'
                                  : rule.riskLevel === 'very-high'
                                  ? 'bg-red-200 text-red-900 border-red-400'
                                  : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                              }
                              data-testid={`badge-risk-level-${rule.id}`}
                            >
                              {rule.riskLevel === 'low' ? 'Low' : rule.riskLevel === 'low-medium' ? 'Low-Medium' : rule.riskLevel === 'medium' ? 'Medium' : rule.riskLevel === 'medium-high' ? 'Medium-High' : rule.riskLevel === 'high' ? 'High' : rule.riskLevel === 'very-high' ? 'Very High' : 'Medium'}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-[color:var(--t-color-text-muted)] mb-3">{rule.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {getConditionBadge(rule.isStartup, 'Startup')}
                            {getConditionBadge(rule.hasExistingCashflow, 'Existing Cashflow')}
                            {getConditionBadge(rule.hasTransitionRisk, 'Transition Risk')}
                            {getConditionBadge(rule.includesRealEstate, 'Real Estate')}
                            {rule.creScope !== 'any' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                CRE: {rule.creScope === 'purchase' ? 'Purchase' : 'Improvement'}
                              </span>
                            )}
                            {getConditionBadge(rule.isPartnerBuyout, 'Partner Buyout')}
                            {getConditionBadge(rule.involvesConstruction, 'Construction')}
                            {getConditionBadge(rule.includesDebtRefinance, 'Debt Refinance')}
                            {getConditionBadge(rule.debtRefinancePrimary, 'Debt Refi Primary')}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProjectTypeRuleModal(rule)}
                            data-testid={`button-edit-rule-${rule.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteProjectTypeRule(rule.id)}
                            data-testid={`button-delete-rule-${rule.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[color:var(--t-color-text-muted)]" data-testid="text-no-project-type-rules">
                <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No project type rules configured yet.</p>
                <p className="text-sm mt-1">Add rules to automatically classify projects based on BDO answers.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Project Type Rule Modal */}
        <Dialog open={projectTypeRuleModalOpen} onOpenChange={setProjectTypeRuleModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-project-type-rule-form">
            <DialogHeader>
              <DialogTitle>{editingProjectTypeRule ? 'Edit Project Type Rule' : 'Add Project Type Rule'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-type-rule-name">Rule Name *</Label>
                  <Input
                    id="project-type-rule-name"
                    value={projectTypeRuleForm.name}
                    onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, name: e.target.value })}
                    placeholder="e.g., Startup with Real Estate"
                    data-testid="input-project-type-rule-name"
                  />
                </div>
                <div>
                  <Label htmlFor="project-type-rule-priority">Priority</Label>
                  <Input
                    id="project-type-rule-priority"
                    type="number"
                    value={projectTypeRuleForm.priority}
                    onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, priority: parseInt(e.target.value) || 0 })}
                    data-testid="input-project-type-rule-priority"
                  />
                  <p className="text-xs text-[color:var(--t-color-text-muted)] mt-1">Lower number = higher priority (evaluated first)</p>
                </div>
              </div>

              <div>
                <Label htmlFor="project-type-rule-description">Description</Label>
                <Textarea
                  id="project-type-rule-description"
                  value={projectTypeRuleForm.description || ''}
                  onChange={(e) => setProjectTypeRuleForm({ ...projectTypeRuleForm, description: e.target.value })}
                  placeholder="Optional description of when this rule applies"
                  className="min-h-[80px]"
                  data-testid="textarea-project-type-rule-description"
                />
              </div>

              <div>
                <Label>Risk Level *</Label>
                <RadioGroup
                  value={projectTypeRuleForm.riskLevel}
                  onValueChange={(value) => setProjectTypeRuleForm({ ...projectTypeRuleForm, riskLevel: value as RiskLevel })}
                  className="flex flex-wrap gap-4 mt-2"
                  data-testid="radio-risk-level"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk-low" data-testid="radio-risk-low" />
                    <Label htmlFor="risk-low" className="text-green-700">Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low-medium" id="risk-low-medium" data-testid="radio-risk-low-medium" />
                    <Label htmlFor="risk-low-medium" className="text-lime-700">Low-Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk-medium" data-testid="radio-risk-medium" />
                    <Label htmlFor="risk-medium" className="text-yellow-600">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium-high" id="risk-medium-high" data-testid="radio-risk-medium-high" />
                    <Label htmlFor="risk-medium-high" className="text-orange-600">Medium-High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk-high" data-testid="radio-risk-high" />
                    <Label htmlFor="risk-high" className="text-red-600">High</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very-high" id="risk-very-high" data-testid="radio-risk-very-high" />
                    <Label htmlFor="risk-very-high" className="text-red-900">Very High</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="project-type-rule-fallback"
                  checked={projectTypeRuleForm.isFallback}
                  onCheckedChange={(checked) => setProjectTypeRuleForm({ ...projectTypeRuleForm, isFallback: checked })}
                  data-testid="switch-project-type-rule-fallback"
                />
                <Label htmlFor="project-type-rule-fallback">Fallback Rule (used when no other rules match)</Label>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">Classification Conditions</Label>
                <p className="text-sm text-[color:var(--t-color-text-muted)] mb-4">
                  Set conditions for this rule. &quot;Any&quot; means the condition will match regardless of the answer.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="condition-startup">Is this a startup business?</Label>
                    <Select
                      value={String(projectTypeRuleForm.isStartup)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        isStartup: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-startup" data-testid="select-condition-startup">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-cashflow">Has existing cashflow?</Label>
                    <Select
                      value={String(projectTypeRuleForm.hasExistingCashflow)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        hasExistingCashflow: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-cashflow" data-testid="select-condition-cashflow">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-transition">Has transition risk?</Label>
                    <Select
                      value={String(projectTypeRuleForm.hasTransitionRisk)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        hasTransitionRisk: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-transition" data-testid="select-condition-transition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-realestate">Includes real estate?</Label>
                    <Select
                      value={String(projectTypeRuleForm.includesRealEstate)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        includesRealEstate: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-realestate" data-testid="select-condition-realestate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-cre-scope">CRE Scope</Label>
                    <Select
                      value={projectTypeRuleForm.creScope}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        creScope: value as CREScope
                      })}
                    >
                      <SelectTrigger id="condition-cre-scope" data-testid="select-condition-cre-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="purchase">Purchase</SelectItem>
                        <SelectItem value="improvement">Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-buyout">Is partner buyout?</Label>
                    <Select
                      value={String(projectTypeRuleForm.isPartnerBuyout)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        isPartnerBuyout: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-buyout" data-testid="select-condition-buyout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-construction">Involves construction?</Label>
                    <Select
                      value={String(projectTypeRuleForm.involvesConstruction)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        involvesConstruction: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-construction" data-testid="select-condition-construction">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-debt-refinance">Includes Debt Refinance?</Label>
                    <Select
                      value={String(projectTypeRuleForm.includesDebtRefinance)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        includesDebtRefinance: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-debt-refinance" data-testid="select-condition-debt-refinance">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="condition-debt-refinance-primary">Debt Refinance Primary?</Label>
                    <Select
                      value={String(projectTypeRuleForm.debtRefinancePrimary)}
                      onValueChange={(value) => setProjectTypeRuleForm({
                        ...projectTypeRuleForm,
                        debtRefinancePrimary: value === 'any' ? 'any' : value === 'true'
                      })}
                    >
                      <SelectTrigger id="condition-debt-refinance-primary" data-testid="select-condition-debt-refinance-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProjectTypeRuleModalOpen(false)} data-testid="button-cancel-project-type-rule">
                Cancel
              </Button>
              <Button
                onClick={handleProjectTypeRuleSubmit}
                data-testid="button-submit-project-type-rule"
              >
                {editingProjectTypeRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">User Management</h2>
                <p className="text-sm text-[color:var(--t-color-text-muted)]">
                  Manage team members and their roles for the loan application system.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={loadAppUsers}
                  variant="outline"
                  disabled={isLoadingUsers}
                >
                  {isLoadingUsers ? 'Refreshing...' : 'Refresh'}
                </Button>
                <Button onClick={() => setAddUserModalOpen(true)} data-testid="button-add-user">
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </div>
            </div>

            {appUsers.length > 0 && (
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="max-w-md"
                  data-testid="input-user-search"
                />
              </div>
            )}

            {isLoadingUsers ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin w-8 h-8 border-4 border-[var(--t-color-accent)] border-t-transparent rounded-full"></div>
                <p className="text-[color:var(--t-color-text-muted)] mt-4">Loading users...</p>
              </div>
            ) : appUsers.length === 0 ? (
              <div className="text-center py-12 bg-[var(--t-color-page-bg)] rounded-lg border border-dashed border-[var(--t-color-border)]">
                <Users className="w-12 h-12 text-[color:var(--t-color-text-muted)] mx-auto mb-3" />
                <p className="text-[color:var(--t-color-text-muted)] mb-4">No users found.</p>
                <Button onClick={() => setAddUserModalOpen(true)} variant="outline" data-testid="button-add-first-user">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First User
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[var(--t-color-page-bg)] border-b border-[var(--t-color-border)]">
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Created</th>
                      <th className="text-right px-4 py-3 text-sm font-semibold text-[color:var(--t-color-text-body)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appUsers
                      .filter((user) => {
                        if (!userSearchQuery.trim()) return true;
                        const query = userSearchQuery.toLowerCase();
                        return (
                          (user.email || '').toLowerCase().includes(query) ||
                          (user.displayName || '').toLowerCase().includes(query) ||
                          user.role.toLowerCase().includes(query)
                        );
                      })
                      .map((user) => (
                      <tr key={user.uid} className="border-b border-[var(--t-color-border)] hover:bg-[var(--t-color-page-bg)]" data-testid={`row-user-${user.uid}`}>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-body)]">
                          {user.displayName || 'No name'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">
                          {user.email || 'No email'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'Admin' ? 'default' : user.role === 'PQ Committee' ? 'secondary' : 'outline'}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-[color:var(--t-color-text-muted)]">
                          {user.createdAt.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteAppUser(user.uid, user.email)}
                              disabled={isDeletingUser === user.uid || user.uid === userInfo?.uid}
                              data-testid={`button-delete-user-${user.uid}`}
                            >
                              {isDeletingUser === user.uid ? (
                                <span className="animate-spin">&#10227;</span>
                              ) : (
                                <Trash2 className="w-4 h-4 text-[color:var(--t-color-danger-text)]" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* AI Block Templates Tab */}
        <TabsContent value="ai-block-templates" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)]">AI Block Templates</h2>
            <Button onClick={() => openTemplateModal()} data-testid="button-add-template">
              <Plus className="w-4 h-4 mr-2" />
              Add New Template
            </Button>
          </div>

          <div className="space-y-4">
            {settings.aiBlockTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border border-[var(--t-color-border)] p-6" data-testid={`template-card-${template.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[color:var(--t-color-text-body)] mb-2" data-testid={`text-template-name-${template.id}`}>{template.name}</h3>
                    <p className="text-sm text-[color:var(--t-color-text-muted)] mb-2" data-testid={`text-template-description-${template.id}`}>{template.description}</p>
                    <p className="text-sm text-[color:var(--t-color-text-muted)]" data-testid={`text-template-fields-${template.id}`}>
                      <strong>Input Fields:</strong> {template.inputFields.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openTemplateModal(template)} data-testid={`button-edit-template-${template.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteAIBlockTemplate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {template.inputFields.length > 0 && (
                  <div className="mt-3 p-3 bg-[var(--t-color-page-bg)] rounded">
                    <p className="text-sm font-medium text-[color:var(--t-color-text-body)] mb-2">Fields:</p>
                    <div className="space-y-1">
                      {template.inputFields.map((field, idx) => (
                        <p key={idx} className="text-sm text-[color:var(--t-color-text-muted)]" data-testid={`text-template-field-${template.id}-${idx}`}>
                          &bull; {field.label} ({field.type}){field.required ? ' *' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {settings.aiBlockTemplates.length === 0 && (
              <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-12 text-center">
                <p className="text-[color:var(--t-color-text-muted)]">No AI block templates yet. Add your first template to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Note Tags Tab */}
        <TabsContent value="note-tags" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">Note Tags</h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Manage the available tags that users can apply to project notes.
              </p>
            </div>

            <div className="mb-6">
              <Label htmlFor="new-tag">Add New Tag</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="new-tag"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Enter tag name"
                  data-testid="input-new-tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addNoteTag();
                    }
                  }}
                />
                <Button
                  onClick={addNoteTag}
                  data-testid="button-add-tag"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tag
                </Button>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {settings.noteTags.map((tag) => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--t-color-page-bg)] border border-[var(--t-color-border)] rounded-lg"
                    data-testid={`tag-${tag.toLowerCase().replace(' ', '-')}`}
                  >
                    <span className="text-sm text-[color:var(--t-color-text-body)]">{tag}</span>
                    <button
                      onClick={() => deleteNoteTag(tag)}
                      className="p-0.5 rounded hover:bg-red-50 text-[color:var(--t-color-danger-light)]"
                      title="Remove tag"
                      data-testid={`button-remove-tag-${tag.toLowerCase().replace(' ', '-')}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              {settings.noteTags.length === 0 && (
                <p className="text-sm text-[color:var(--t-color-text-muted)] mt-2">No tags defined. Add at least one tag to get started.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* File Upload Instructions Tab */}
        <TabsContent value="file-upload-instructions" className="space-y-6">
          <div className="bg-white rounded-lg border border-[var(--t-color-border)] p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-[color:var(--t-color-text-body)] mb-2">File Upload Instructions</h2>
              <p className="text-sm text-[color:var(--t-color-text-muted)]">
                Configure the instructions displayed for each file upload section in the loan application.
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="instructions-business-applicant" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Business Applicant
                </Label>
                <Textarea
                  id="instructions-business-applicant"
                  value={settings.fileUploadInstructions?.businessApplicant || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        businessApplicant: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for business applicant file uploads..."
                  data-testid="textarea-instructions-business-applicant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-individual-applicants" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Individual Applicants
                </Label>
                <Textarea
                  id="instructions-individual-applicants"
                  value={settings.fileUploadInstructions?.individualApplicants || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        individualApplicants: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for individual applicant file uploads..."
                  data-testid="textarea-instructions-individual-applicants"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-other-businesses" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Other Businesses
                </Label>
                <Textarea
                  id="instructions-other-businesses"
                  value={settings.fileUploadInstructions?.otherBusinesses || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        otherBusinesses: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for other businesses file uploads..."
                  data-testid="textarea-instructions-other-businesses"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions-project-files" className="text-sm font-medium text-[color:var(--t-color-text-body)]">
                  Project Files
                </Label>
                <Textarea
                  id="instructions-project-files"
                  value={settings.fileUploadInstructions?.projectFiles || ''}
                  onChange={(e) => {
                    setSettings({
                      ...settings,
                      fileUploadInstructions: {
                        ...settings.fileUploadInstructions,
                        projectFiles: e.target.value,
                      },
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full min-h-[100px]"
                  placeholder="Enter instructions for project file uploads..."
                  data-testid="textarea-instructions-project-files"
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Add User Modal */}
        <Dialog open={addUserModalOpen} onOpenChange={setAddUserModalOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-add-user">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="user-first-name">First Name</Label>
                  <Input
                    id="user-first-name"
                    value={newUserForm.firstName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                    placeholder="Enter first name"
                    data-testid="input-user-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="user-last-name">Last Name</Label>
                  <Input
                    id="user-last-name"
                    value={newUserForm.lastName}
                    onChange={(e) => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                    placeholder="Enter last name"
                    data-testid="input-user-last-name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="user-email">Email *</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                  data-testid="input-user-email"
                />
              </div>

              <div>
                <Label htmlFor="user-phone">Phone</Label>
                <Input
                  id="user-phone"
                  value={newUserForm.phone}
                  onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                  data-testid="input-user-phone"
                />
              </div>

              <div>
                <Label htmlFor="user-role">Role *</Label>
                <p className="text-xs text-[color:var(--t-color-text-muted)] mb-1">Controls the user's permissions in the system</p>
                <Select
                  value={newUserForm.role}
                  onValueChange={(value) => setNewUserForm({ ...newUserForm, role: value })}
                >
                  <SelectTrigger id="user-role" data-testid="select-user-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BDO">BDO</SelectItem>
                    <SelectItem value="BDO Manager">BDO Manager</SelectItem>
                    <SelectItem value="Credit Executive">Credit Executive</SelectItem>
                    <SelectItem value="BDA">BDA</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddUserModalOpen(false)} data-testid="button-cancel-add-user">
                Cancel
              </Button>
              <Button
                onClick={handleAddUser}
                disabled={isAddingUser || !newUserForm.email || !newUserForm.role}
                data-testid="button-submit-add-user"
              >
                {isAddingUser ? 'Adding...' : 'Add User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fee Configuration Modal */}
        <Dialog open={feeConfigModalOpen} onOpenChange={setFeeConfigModalOpen}>
          <DialogContent className="max-w-md" data-testid="dialog-fee-config">
            <DialogHeader>
              <DialogTitle>
                {editingFeeConfig ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="fee-name">Fee Name *</Label>
                <Select
                  value={feeConfigForm.feeName}
                  onValueChange={(value) => setFeeConfigForm({ ...feeConfigForm, feeName: value as FeeNameType })}
                >
                  <SelectTrigger id="fee-name" data-testid="select-fee-name">
                    <SelectValue placeholder="Select a fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_NAME_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fee-amount">Amount *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="fee-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={feeConfigForm.amount || ''}
                    onChange={(e) => setFeeConfigForm({ ...feeConfigForm, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    data-testid="input-fee-amount"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fee-includes-real-estate">Condition: Includes Real Estate? *</Label>
                <Select
                  value={feeConfigForm.includesRealEstate ? 'yes' : 'no'}
                  onValueChange={(value) => setFeeConfigForm({ ...feeConfigForm, includesRealEstate: value === 'yes' })}
                >
                  <SelectTrigger id="fee-includes-real-estate" data-testid="select-fee-includes-real-estate">
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="fee-description">Description</Label>
                <Input
                  id="fee-description"
                  value={feeConfigForm.description}
                  onChange={(e) => setFeeConfigForm({ ...feeConfigForm, description: e.target.value })}
                  placeholder="Optional description"
                  data-testid="input-fee-description"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="fee-active">Active</Label>
                <Switch
                  id="fee-active"
                  checked={feeConfigForm.active}
                  onCheckedChange={(checked) => setFeeConfigForm({ ...feeConfigForm, active: checked })}
                  data-testid="switch-fee-active"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setFeeConfigModalOpen(false);
                  setEditingFeeConfig(null);
                  setFeeConfigForm(emptyFeeConfigurationForm);
                }}
                data-testid="button-cancel-fee-config"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFeeConfigSubmit}
                disabled={!feeConfigForm.feeName || feeConfigForm.amount <= 0}
                data-testid="button-submit-fee-config"
              >
                {editingFeeConfig ? 'Update' : 'Add'} Fee Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Tabs>
    </BDOLayout>
  );
}
