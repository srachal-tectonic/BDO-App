// BORROWER ROUTES TEMPORARILY DISABLED - May be re-enabled in the future
// Redirects to home page for now

import { redirect } from 'next/navigation';

export default function BorrowerDashboardPage() {
  redirect('/');
}

/* ORIGINAL CODE - COMMENTED OUT FOR FUTURE USE
'use client';

import { BorrowerLayout } from '@/components/layout/BorrowerLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function BorrowerDashboardPage() {
  return (
    <BorrowerLayout title="Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Your Borrower Portal</h1>
          <p className="text-muted-foreground mt-2">
            Manage your SBA loan application and upload required documents
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loan Application</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">In Progress</div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your application form
              </p>
              <Link href="/borrower/application">
                <Button className="w-full mt-4" variant="outline">
                  View Application
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0 / 5</div>
              <p className="text-xs text-muted-foreground mt-1">
                Required documents uploaded
              </p>
              <Link href="/borrower/uploads">
                <Button className="w-full mt-4" variant="outline">
                  Upload Documents
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Pending</div>
              <p className="text-xs text-muted-foreground mt-1">
                Awaiting review
              </p>
              <Button className="w-full mt-4" variant="outline" disabled>
                Check Status
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest updates and actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">Application Started</p>
                  <p className="text-sm text-muted-foreground">
                    Your loan application has been initiated
                  </p>
                </div>
                <div className="ml-auto text-sm text-muted-foreground">Today</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
            <CardDescription>Complete these actions to move forward</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Complete your loan application form</li>
              <li>Upload required financial documents</li>
              <li>Review and submit your application</li>
              <li>Wait for your BDO to review</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </BorrowerLayout>
  );
}
*/
