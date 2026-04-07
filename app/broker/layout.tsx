import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Broker Portal | SBA Loan Prequalifier',
  description: 'Upload documents for your loan application',
};

export default function BrokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">SBA</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Document Upload Portal
              </h1>
              <p className="text-xs text-gray-500">Broker Access</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>

      {/* Simple Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center">
          <p className="text-xs text-gray-500">
            This is a secure document upload portal. Files uploaded here are
            securely stored and only accessible to authorized personnel.
          </p>
        </div>
      </footer>
    </div>
  );
}
