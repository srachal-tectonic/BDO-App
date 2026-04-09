'use client';

import { useState, useRef } from 'react';
import { Upload, ArrowLeft, Trash2, FileSpreadsheet, Calendar, Layers, X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ConfirmDialog';
import FinancialAnalysisPanel from '@/components/FinancialAnalysisPanel';
import SpreadComparisonTable, { SPREAD_SECTIONS, formatSpreadValue, isSpreadNegative } from '@/components/SpreadComparisonTable';

const SECTIONS = SPREAD_SECTIONS;
const formatValue = formatSpreadValue;
const isNegative = isSpreadNegative;

interface FinancialPeriod {
  periodLabel?: string;
  [key: string]: any;
}

interface FinancialSpread {
  id: string;
  versionLabel: string;
  fileName: string;
  isActive: boolean;
  uploadedAt?: string;
  periodData?: FinancialPeriod[];
}

interface FinancialsSectionProps {
  projectId: string;
  children?: React.ReactNode;
}

export default function FinancialsSection({ projectId, children }: FinancialsSectionProps) {
  const [spreads, setSpreads] = useState<FinancialSpread[]>([]);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('comparison');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setSpreads(prev => prev.filter(s => s.id !== id));
    setSelectedSpreadId(null);
  };

  const handleSetActive = (id: string) => {
    setSpreads(prev => prev.map(s => ({ ...s, isActive: s.id === id })));
  };

  const handleUploadSuccess = (newSpread: FinancialSpread) => {
    setSpreads(prev => [...prev, newSpread]);
    setShowUploadDialog(false);
  };

  const selectedSpread = spreads.find(s => s.id === selectedSpreadId);

  if (selectedSpread) {
    return (
      <SpreadDetailView
        spread={selectedSpread}
        projectId={projectId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBack={() => { setSelectedSpreadId(null); setActiveTab('comparison'); }}
        onDelete={() => handleDelete(selectedSpread.id)}
      />
    );
  }

  return (
    <div className="bg-white border border-[#c5d4e8] rounded-lg mb-3 transition-all hover:shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3">
        <div>
          <h2 className="text-[13px] font-semibold text-[#1a1a1a]" data-testid="text-financials-title">Financial Spreads</h2>
          <p className="text-[#7da1d4] text-[11px] mt-0.5">Upload and compare financial statements across periods</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowUploadDialog(true)}
          className="bg-[#2563eb] text-white gap-2"
          data-testid="button-upload-spread"
        >
          <Upload className="w-4 h-4" />
          Upload Spreadsheet
        </Button>
      </div>

      {spreads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 px-4">
          <div className="w-12 h-12 rounded-full bg-[#f0f4ff] flex items-center justify-center mb-3">
            <FileSpreadsheet className="w-6 h-6 text-[#2563eb]" />
          </div>
          <p className="text-[#7da1d4] text-[13px] mb-1">No financial spreads uploaded yet</p>
          <p className="text-[#a1b3d2] text-[11px] mb-3">Upload an Excel spreadsheet to get started</p>
          <Button
            size="sm"
            onClick={() => setShowUploadDialog(true)}
            variant="outline"
            className="gap-2"
            data-testid="button-upload-spread-empty"
          >
            <Upload className="w-4 h-4" />
            Upload Spreadsheet
          </Button>
        </div>
      ) : (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {spreads.map(spread => (
            <div
              key={spread.id}
              className={`border rounded-lg p-4 cursor-pointer hover-elevate active-elevate-2 transition-all ${
                spread.isActive
                  ? 'border-[#133c7f] bg-[#f0f4ff]'
                  : 'border-[#c5d4e8]'
              }`}
              onClick={() => setSelectedSpreadId(spread.id)}
              data-testid={`card-spread-${spread.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    spread.isActive ? 'bg-[#133c7f]' : 'bg-[#f0f4ff]'
                  }`}>
                    <FileSpreadsheet className={`w-5 h-5 ${spread.isActive ? 'text-white' : 'text-[#2563eb]'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#1a1a1a] truncate" data-testid={`text-version-${spread.id}`}>
                        {spread.versionLabel}
                      </p>
                      {spread.isActive && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-[#133c7f] text-white flex-shrink-0" data-testid={`badge-active-${spread.id}`}>
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#7da1d4] truncate">{spread.fileName}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(spread.id); }}
                  className="p-1.5 rounded-md text-[#a1b3d2] hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  data-testid={`button-delete-spread-${spread.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-[11px] text-[#7da1d4]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {spread.uploadedAt ? new Date(spread.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    {spread.periodData?.length || 0} period{(spread.periodData?.length || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                {!spread.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetActive(spread.id);
                    }}
                    className="text-[11px] h-7 px-3 border-[#133c7f] text-[#133c7f]"
                    data-testid={`button-set-active-${spread.id}`}
                  >
                    Activate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {children}

      {showUploadDialog && (
        <UploadDialog
          projectId={projectId}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId !== null}
        title="Delete Financial Spread"
        description="Are you sure you want to delete this financial spread? This action cannot be undone."
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
}

function UploadDialog({ projectId, onClose, onSuccess }: { projectId: string; onClose: () => void; onSuccess: (spread: FinancialSpread) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile || !versionLabel.trim()) {
      alert('Please select a file and enter a version label.');
      return;
    }
    setUploading(true);
    try {
      // Create a local spread entry from the uploaded file
      const newSpread: FinancialSpread = {
        id: `spread-${Date.now()}`,
        versionLabel: versionLabel.trim(),
        fileName: selectedFile.name,
        isActive: false,
        uploadedAt: new Date().toISOString(),
        periodData: [],
      };
      onSuccess(newSpread);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold text-[#1a1a1a]">Upload Financial Spreadsheet</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100" data-testid="button-close-upload">
            <X className="w-4 h-4 text-[#7da1d4]" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Version Label</label>
            <input
              type="text"
              value={versionLabel}
              onChange={e => setVersionLabel(e.target.value)}
              placeholder="e.g., 2024 Year End, Q3 2024 Interim"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#2563eb] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] bg-white transition-all"
              data-testid="input-version-label"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1">Spreadsheet File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              data-testid="input-file-upload"
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#c5d4e8] rounded-lg p-6 text-center cursor-pointer hover:border-[#2563eb] hover:bg-[#f0f4ff] transition-all"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-[#2563eb]" />
                  <span className="text-sm text-[#1a1a1a] font-medium">{selectedFile.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-[#a1b3d2] mx-auto mb-2" />
                  <p className="text-sm text-[#7da1d4]">Click to select .xlsx, .xls, or .xlsm file</p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-upload">
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile || !versionLabel.trim()}
              className="flex-1 bg-[#2563eb] text-white gap-2"
              data-testid="button-confirm-upload"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Uploading...' : 'Upload & Parse'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpreadDetailView({
  spread,
  projectId,
  activeTab,
  setActiveTab,
  onBack,
  onDelete,
}: {
  spread: FinancialSpread;
  projectId: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onBack: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const periods = spread.periodData || [];

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[#c5d4e8] px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} data-testid="button-back-to-spreads">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-[13px] font-semibold text-[#1a1a1a]" data-testid="text-spread-title">
              {spread.versionLabel}
            </h2>
            <p className="text-[#7da1d4] text-[11px]">
              {spread.fileName} · {periods.length} period{periods.length !== 1 ? 's' : ''}
              {spread.uploadedAt && ` · Uploaded ${new Date(spread.uploadedAt).toLocaleDateString('en-US')}`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 border-red-200 hover:bg-red-50 gap-2" data-testid="button-delete-current-spread">
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Financial Spread"
        description={`Are you sure you want to delete "${spread.versionLabel}"? This action cannot be undone.`}
        onConfirm={() => { setShowDeleteConfirm(false); onDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <div className="border-b border-[#c5d4e8] px-4 flex gap-0 overflow-x-auto">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'comparison'
              ? 'border-[#2563eb] text-[#2563eb]'
              : 'border-transparent text-[#7da1d4] hover:text-[#1a1a1a]'
          }`}
          data-testid="tab-comparison-view"
        >
          Comparison View
        </button>
        {periods.map((period, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(`period-${idx}`)}
            className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === `period-${idx}`
                ? 'border-[#2563eb] text-[#2563eb]'
                : 'border-transparent text-[#7da1d4] hover:text-[#1a1a1a]'
            }`}
            data-testid={`tab-period-${idx}`}
          >
            {period.periodLabel || `Period ${idx + 1}`}
          </button>
        ))}
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'analysis'
              ? 'border-[#2563eb] text-[#2563eb]'
              : 'border-transparent text-[#7da1d4] hover:text-[#1a1a1a]'
          }`}
          data-testid="tab-ai-analysis"
        >
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI Analysis
          </span>
        </button>
      </div>

      <div className="p-4 overflow-x-auto">
        {activeTab === 'analysis' ? (
          <FinancialAnalysisPanel
            projectId={projectId}
            spreadId={spread.id}
          />
        ) : activeTab === 'comparison' ? (
          <SpreadComparisonTable periods={periods} />
        ) : (
          <PeriodDetail period={periods[parseInt(activeTab.split('-')[1])]} index={parseInt(activeTab.split('-')[1])} />
        )}
      </div>
    </div>
  );
}

function PeriodDetail({ period, index }: { period: FinancialPeriod; index: number }) {
  if (!period) {
    return <p className="text-[#7da1d4] text-center py-10">Period data not available.</p>;
  }

  return (
    <div className="max-w-2xl" data-testid={`detail-period-${index}`}>
      {SECTIONS.map(section => (
        <div key={section.title} className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#2563eb] mb-2 pb-1 border-b-2 border-[#2563eb]">
            {section.title}
          </h3>
          <div className="space-y-0">
            {section.fields.map(field => {
              const val = (period as any)[field.key];
              const neg = isNegative(field.key, val);
              return (
                <div key={field.key} className="flex items-center justify-between py-2 px-2 border-b border-[#e2e8f0] hover:bg-[#fafbfd]">
                  <span className="text-[13px] text-[#1a1a1a] font-medium">{field.label}</span>
                  <span className={`text-[13px] tabular-nums ${neg ? 'text-red-600 font-medium' : 'text-[#1a1a1a]'}`}>
                    {formatValue(field.key, val)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
