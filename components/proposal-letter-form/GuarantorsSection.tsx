import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Guarantor {
  id: string;
  fullName: string;
  ownershipPercentage: number;
  titleRelationship: string;
}

interface GuarantorsSectionProps {
  guarantors: Guarantor[];
  onChange: (guarantors: Guarantor[]) => void;
}

export function GuarantorsSection({ guarantors, onChange }: GuarantorsSectionProps) {
  const addGuarantor = () => {
    const newGuarantor: Guarantor = {
      id: `guarantor-${Date.now()}`,
      fullName: '',
      ownershipPercentage: 0,
      titleRelationship: ''
    };
    onChange([...guarantors, newGuarantor]);
  };

  const removeGuarantor = (id: string) => {
    onChange(guarantors.filter(g => g.id !== id));
  };

  const updateGuarantor = (id: string, field: keyof Guarantor, value: any) => {
    onChange(guarantors.map(g => 
      g.id === id ? { ...g, [field]: value } : g
    ));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
          <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Individual Guarantors</h4>
        </div>
        <Button
          type="button"
          onClick={addGuarantor}
          size="sm"
          className="gap-2"
          data-testid="button-add-guarantor"
        >
          <Plus className="w-4 h-4" />
          Add Guarantor
        </Button>
      </div>

      {guarantors.length === 0 ? (
        <div className="text-center py-8 bg-[#f9fafb] rounded-lg border-2 border-dashed border-[#e5e7eb]">
          <p className="text-[14px] text-[#6b7280] mb-3">No guarantors added yet</p>
          <Button
            type="button"
            onClick={addGuarantor}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-add-first-guarantor"
          >
            <Plus className="w-4 h-4" />
            Add First Guarantor
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {guarantors.map((guarantor, index) => (
            <div
              key={guarantor.id}
              className="p-4 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] space-y-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[#1a1a1a]">
                  Guarantor #{index + 1}
                </span>
                <Button
                  type="button"
                  onClick={() => removeGuarantor(guarantor.id)}
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  data-testid={`button-remove-guarantor-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`guarantor-name-${guarantor.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                    Full Name
                  </Label>
                  <Input
                    id={`guarantor-name-${guarantor.id}`}
                    value={guarantor.fullName}
                    onChange={(e) => updateGuarantor(guarantor.id, 'fullName', e.target.value)}
                    placeholder="e.g., John Smith"
                    className="text-[14px]"
                    data-testid={`input-guarantor-name-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`guarantor-ownership-${guarantor.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                    Ownership %
                  </Label>
                  <Input
                    id={`guarantor-ownership-${guarantor.id}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={guarantor.ownershipPercentage}
                    onChange={(e) => updateGuarantor(guarantor.id, 'ownershipPercentage', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="text-[14px]"
                    data-testid={`input-guarantor-ownership-${index}`}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`guarantor-title-${guarantor.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                    Title/Relationship
                  </Label>
                  <Input
                    id={`guarantor-title-${guarantor.id}`}
                    value={guarantor.titleRelationship}
                    onChange={(e) => updateGuarantor(guarantor.id, 'titleRelationship', e.target.value)}
                    placeholder="e.g., Owner, CEO"
                    className="text-[14px]"
                    data-testid={`input-guarantor-title-${index}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-[#e5e7eb]">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-[13px] text-blue-900">
              <p className="font-medium mb-1">Personal Guarantee Requirements</p>
              <p className="text-blue-800">
                SBA requires unlimited personal guarantees from all owners with 20% or greater ownership. 
                USDA has similar requirements. List all individuals who will provide personal guarantees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
