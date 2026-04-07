import { Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface UseOfProceedsItem {
  id: string;
  description: string;
  amount: number;
  category: string;
  notes: string;
}

interface UseOfProceedsSectionProps {
  items: UseOfProceedsItem[];
  onChange: (items: UseOfProceedsItem[]) => void;
}

const categories = [
  'Real Estate Purchase',
  'Building Construction/Renovation',
  'Equipment Purchase',
  'Working Capital',
  'Inventory',
  'Debt Refinancing',
  'Franchise Fee',
  'Professional Fees',
  'Other'
];

export function UseOfProceedsSection({ items, onChange }: UseOfProceedsSectionProps) {
  const addItem = () => {
    const newItem: UseOfProceedsItem = {
      id: `use-${Date.now()}`,
      description: '',
      amount: 0,
      category: 'Working Capital',
      notes: ''
    };
    onChange([...items, newItem]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof UseOfProceedsItem, value: any) => {
    onChange(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#2563eb]"></div>
          <h4 className="text-[15px] font-semibold text-[#1a1a1a]">Use of Loan Proceeds (Exhibit A)</h4>
        </div>
        <Button
          type="button"
          onClick={addItem}
          size="sm"
          className="gap-2"
          data-testid="button-add-use-item"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 bg-[#f9fafb] rounded-lg border-2 border-dashed border-[#e5e7eb]">
          <p className="text-[14px] text-[#6b7280] mb-3">No use of proceeds items added yet</p>
          <Button
            type="button"
            onClick={addItem}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-add-first-use-item"
          >
            <Plus className="w-4 h-4" />
            Add First Item
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="p-4 bg-[#f9fafb] rounded-lg border border-[#e5e7eb] space-y-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-[#1a1a1a]">
                    Item #{index + 1}
                  </span>
                  <Button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    data-testid={`button-remove-use-item-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`use-category-${item.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Category
                    </Label>
                    <Select 
                      value={item.category} 
                      onValueChange={(value) => updateItem(item.id, 'category', value)}
                    >
                      <SelectTrigger id={`use-category-${item.id}`} data-testid={`select-use-category-${index}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`use-amount-${item.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Amount
                    </Label>
                    <Input
                      id={`use-amount-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="text-[14px]"
                      data-testid={`input-use-amount-${index}`}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor={`use-description-${item.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Description
                    </Label>
                    <Input
                      id={`use-description-${item.id}`}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="e.g., Purchase of commercial property at 123 Main St"
                      className="text-[14px]"
                      data-testid={`input-use-description-${index}`}
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <Label htmlFor={`use-notes-${item.id}`} className="text-[13px] font-medium text-[#1a1a1a]">
                      Notes (Optional)
                    </Label>
                    <Input
                      id={`use-notes-${item.id}`}
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, 'notes', e.target.value)}
                      placeholder="Additional details..."
                      className="text-[14px]"
                      data-testid={`input-use-notes-${index}`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#eff6ff] to-white border-2 border-[#2563eb] rounded-lg">
            <span className="text-[15px] font-semibold text-[#1a1a1a]">Total Use of Proceeds:</span>
            <span className="text-[18px] font-bold text-[#2563eb]" data-testid="text-total-use-amount">
              {formatCurrency(totalAmount)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
