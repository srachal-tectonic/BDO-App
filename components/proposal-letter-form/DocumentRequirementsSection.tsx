import { Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DocumentRequirement {
  id: string;
  category: string;
  requirement: string;
  checked: boolean;
}

interface CustomCondition {
  id: string;
  condition: string;
}

interface DocumentRequirementsSectionProps {
  requirements: DocumentRequirement[];
  customRequirements: CustomCondition[];
  onRequirementsChange: (requirements: DocumentRequirement[]) => void;
  onCustomChange: (custom: CustomCondition[]) => void;
}

export function DocumentRequirementsSection({ 
  requirements, 
  customRequirements,
  onRequirementsChange,
  onCustomChange 
}: DocumentRequirementsSectionProps) {
  const toggleRequirement = (id: string) => {
    onRequirementsChange(requirements.map(req =>
      req.id === id ? { ...req, checked: !req.checked } : req
    ));
  };

  const addCustomRequirement = () => {
    const newReq: CustomCondition = {
      id: `custom-${Date.now()}`,
      condition: ''
    };
    onCustomChange([...customRequirements, newReq]);
  };

  const updateCustomRequirement = (id: string, value: string) => {
    onCustomChange(customRequirements.map(req =>
      req.id === id ? { ...req, condition: value } : req
    ));
  };

  const removeCustomRequirement = (id: string) => {
    onCustomChange(customRequirements.filter(req => req.id !== id));
  };

  // Group requirements by category
  const groupedRequirements = requirements.reduce((acc, req) => {
    if (!acc[req.category]) {
      acc[req.category] = [];
    }
    acc[req.category].push(req);
    return acc;
  }, {} as Record<string, DocumentRequirement[]>);

  const checkedCount = requirements.filter(r => r.checked).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
          <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Document Requirements (Exhibit C)</h4>
        </div>
        <span className="text-[13px] text-[#6b7280]">
          {checkedCount} of {requirements.length} selected
        </span>
      </div>

      {/* Standard Requirements */}
      <div className="space-y-6">
        {Object.entries(groupedRequirements).map(([category, reqs]) => (
          <div key={category} className="space-y-3">
            <h5 className="text-[14px] font-semibold text-[#1a1a1a] flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></div>
              {category}
            </h5>
            <div className="space-y-2 pl-3">
              {reqs.map((req) => (
                <div key={req.id} className="flex items-start gap-3 p-2 rounded hover-elevate">
                  <Checkbox
                    id={req.id}
                    checked={req.checked}
                    onCheckedChange={() => toggleRequirement(req.id)}
                    data-testid={`checkbox-doc-${req.id}`}
                  />
                  <label
                    htmlFor={req.id}
                    className="text-[13px] text-[#1a1a1a] cursor-pointer flex-1 leading-relaxed"
                  >
                    {req.requirement}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Requirements */}
      <div className="pt-4 border-t border-[#e5e7eb] space-y-4">
        <div className="flex items-center justify-between">
          <h5 className="text-[14px] font-semibold text-[#1a1a1a]">Additional Custom Requirements</h5>
          <Button
            type="button"
            onClick={addCustomRequirement}
            size="sm"
            variant="outline"
            className="gap-2"
            data-testid="button-add-custom-requirement"
          >
            <Plus className="w-4 h-4" />
            Add Custom
          </Button>
        </div>

        {customRequirements.length === 0 ? (
          <p className="text-[13px] text-[#6b7280] text-center py-4 bg-[#f9fafb] rounded-lg">
            No custom requirements added
          </p>
        ) : (
          <div className="space-y-2">
            {customRequirements.map((req, index) => (
              <div key={req.id} className="flex items-center gap-2">
                <Input
                  value={req.condition}
                  onChange={(e) => updateCustomRequirement(req.id, e.target.value)}
                  placeholder="Enter custom document requirement..."
                  className="text-[13px] flex-1"
                  data-testid={`input-custom-requirement-${index}`}
                />
                <Button
                  type="button"
                  onClick={() => removeCustomRequirement(req.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700"
                  data-testid={`button-remove-custom-requirement-${index}`}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="text-[13px] text-blue-900">
            <p className="font-medium mb-1">Document Collection</p>
            <p className="text-blue-800">
              Select all documents required for this loan application. The selected items will be included in Exhibit C of the proposal letter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
