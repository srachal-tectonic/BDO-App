interface LetterDetailsFormProps {
  loanOfficer: {
    letterDate: string;
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  borrower: {
    contactName: string;
    contactTitle: string;
    contactEmail: string;
    businessLegalName: string;
    businessDBA: string;
    mailingAddress: string;
  };
  onLoanOfficerChange: (field: string, value: string) => void;
  onBorrowerChange: (field: string, value: string) => void;
}

export function LetterDetailsForm({ loanOfficer, borrower, onLoanOfficerChange, onBorrowerChange }: LetterDetailsFormProps) {
  return (
    <div className="p-6 bg-white space-y-6">
      {/* Loan Officer Section */}
      <div>
        <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-4">Loan Officer Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Letter Date <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="date"
              value={loanOfficer.letterDate}
              onChange={(e) => onLoanOfficerChange('letterDate', e.target.value)}
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-letter-date"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Loan Officer Name <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={loanOfficer.name}
              onChange={(e) => onLoanOfficerChange('name', e.target.value)}
              placeholder="John Smith"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-loan-officer-name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Title <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={loanOfficer.title}
              onChange={(e) => onLoanOfficerChange('title', e.target.value)}
              placeholder="Senior Loan Officer"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-loan-officer-title"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Email <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="email"
              value={loanOfficer.email}
              onChange={(e) => onLoanOfficerChange('email', e.target.value)}
              placeholder="jsmith@tbank.com"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-loan-officer-email"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Phone <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="tel"
              value={loanOfficer.phone}
              onChange={(e) => onLoanOfficerChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-loan-officer-phone"
            />
          </div>
        </div>
      </div>

      {/* Borrower Section */}
      <div className="border-t border-[#e5e7eb] pt-6">
        <h3 className="text-[16px] font-semibold text-[#1a1a1a] mb-4">Borrower Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Contact Name <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={borrower.contactName}
              onChange={(e) => onBorrowerChange('contactName', e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-contact-name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Contact Title <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={borrower.contactTitle}
              onChange={(e) => onBorrowerChange('contactTitle', e.target.value)}
              placeholder="Owner / CEO"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-contact-title"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Contact Email <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="email"
              value={borrower.contactEmail}
              onChange={(e) => onBorrowerChange('contactEmail', e.target.value)}
              placeholder="jane@business.com"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-contact-email"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Business Legal Name <span className="text-[#ef4444]">*</span>
            </label>
            <input
              type="text"
              value={borrower.businessLegalName}
              onChange={(e) => onBorrowerChange('businessLegalName', e.target.value)}
              placeholder="ABC Company, LLC"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-business-legal-name"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Business DBA (if applicable)
            </label>
            <input
              type="text"
              value={borrower.businessDBA}
              onChange={(e) => onBorrowerChange('businessDBA', e.target.value)}
              placeholder="Trading name"
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-business-dba"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5">
              Mailing Address <span className="text-[#ef4444]">*</span>
            </label>
            <textarea
              value={borrower.mailingAddress}
              onChange={(e) => onBorrowerChange('mailingAddress', e.target.value)}
              placeholder="123 Main Street, Suite 100&#10;City, State ZIP"
              rows={3}
              className="w-full px-3 py-2 text-[14px] border border-[#d1d5db] rounded-lg focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              data-testid="input-borrower-mailing-address"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
