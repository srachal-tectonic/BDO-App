# SBA Loan Prequalifier

A comprehensive Next.js application for managing SBA loan applications with dual portals for Business Development Officers (BDOs) and Borrowers. Built with Firebase/Firestore for data storage and authentication, maintaining the theme and layout from your existing React BDO Tool.

## Features

### BDO Portal
- **Firebase Authentication** - Secure email/password authentication for BDOs
- **Project Management** - Create, track, and manage multiple loan applications
- **Dashboard** - Overview of portfolio statistics and recent activity
- **Stage Tracking** - Monitor projects through Lead, BDO, Underwriting, Closing, and Servicing stages
- **Role-Based Access** - Support for BDO and PQ Committee roles with different permissions
- **Document Management** - Track and request documents from borrowers

### Borrower Portal
- **Auth0 Authentication** - Secure OAuth authentication for borrowers
- **Application Status** - View real-time loan application status
- **Document Upload** - Securely upload required documents
- **Communication** - Direct communication with assigned BDO

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3 with CSS variables
- **UI Components**: shadcn/ui (New York style)
- **Database**: Firebase Firestore
- **Authentication**:
  - Firebase Auth (BDO Portal)
  - Auth0 (Borrower Portal)
- **Icons**: Lucide React

## Project Structure

```
sba-loan-prequalifier/
├── app/
│   ├── bdo/                    # BDO Portal routes
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── projects/
│   ├── borrower/               # Borrower Portal routes
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── auth/callback/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Homepage with portal selection
│   └── globals.css             # Global styles with CSS variables
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/                 # Layout components
│   │   ├── BDOLayout.tsx
│   │   ├── BDOSidebar.tsx
│   │   └── FloatingUserCard.tsx
│   ├── nav-main.tsx
│   ├── nav-user.tsx
│   └── nav-secondary.tsx
├── contexts/
│   ├── FirebaseAuthContext.tsx # Firebase auth provider
│   └── Auth0Context.tsx        # Auth0 provider
├── services/
│   └── firestore.ts            # Firestore CRUD operations
├── lib/
│   ├── firebase.ts             # Firebase configuration
│   └── utils.ts                # Utility functions
└── types/
    └── index.ts                # TypeScript type definitions
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Firebase project (for Firestore and Auth)
- Auth0 account (for Borrower Portal)

### 2. Clone and Install

```bash
cd sba-loan-prequalifier
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Auth0 Configuration for Borrower Portal
NEXT_PUBLIC_AUTH0_DOMAIN=your_domain.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_client_id
NEXT_PUBLIC_AUTH0_REDIRECT_URI=http://localhost:3000/borrower/auth/callback
NEXT_PUBLIC_AUTH0_AUDIENCE=your_api_identifier
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Authentication** with Email/Password provider
4. Enable **Firestore Database** in production mode
5. Copy your Firebase config values to `.env.local`

#### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Projects collection
    match /projects/{projectId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Loans collection
    match /loans/{loanId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Other collections similarly...
  }
}
```

### 5. Auth0 Setup

1. Go to [Auth0 Dashboard](https://manage.auth0.com/)
2. Create a new application (Single Page Application)
3. Configure Allowed Callback URLs: `http://localhost:3000/borrower/auth/callback`
4. Configure Allowed Logout URLs: `http://localhost:3000/borrower/login`
5. Copy your Auth0 config values to `.env.local`

### 6. Create Initial BDO User

Since the BDO portal uses Firebase Auth, you need to create an initial user:

```typescript
// You can create this through Firebase Console or via code
// Go to Firebase Console > Authentication > Users > Add User
// Or use this helper script:

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';

async function createBDOUser() {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    'bdo@example.com',
    'password123'
  );

  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email: 'bdo@example.com',
    displayName: 'BDO User',
    role: 'BDO',
    createdAt: new Date(),
  });
}
```

### 7. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Usage

### BDO Portal

1. Navigate to `/bdo/login`
2. Sign in with your Firebase credentials
3. Access the dashboard to view statistics
4. Go to Projects to create and manage loan applications
5. Track projects through various stages
6. Manage documents and communicate with borrowers

### Borrower Portal

1. Navigate to `/borrower/login`
2. Sign in with Auth0
3. View your loan application status
4. Upload requested documents
5. Track your application progress

## Theme Customization

The application uses CSS variables for theming. Modify `app/globals.css` to customize:

```css
:root {
  --primary: 221.2 83.2% 53.3%;  /* Primary blue color */
  --radius: 0.65rem;              /* Border radius */
  /* ... other variables */
}
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Make sure to add all environment variables in Vercel project settings.

### Other Platforms

Build the application:

```bash
npm run build
npm start
```

## Firestore Data Structure

### Collections

- **users**: User profiles with role information
- **projects**: Loan application projects
- **loans**: Individual loan details
- **fundingStructures**: Funding structure configurations
- **documents**: Document metadata and URLs
- **businessEntities**: Business entity information

## Next Steps

1. **Implement Auth0 Token Exchange** - Create `/api/auth/callback` route for Auth0
2. **Add Form Components** - Create loan application forms
3. **Document Upload** - Implement Firebase Storage integration
4. **Real-time Updates** - Add Firestore real-time listeners
5. **Email Notifications** - Set up email triggers for status changes
6. **Reporting** - Add analytics and reporting features
7. **Testing** - Add unit and integration tests

## Migration from React BDO Tool

This application maintains:
- ✅ Same theme and color scheme
- ✅ Same layout and sidebar structure
- ✅ Same UI components (shadcn/ui)
- ✅ Dual portal architecture
- ✅ Role-based access control

Key differences:
- ❌ No Zoho Creator integration
- ✅ Firebase Firestore instead
- ✅ Auth0 for Borrower Portal
- ✅ Next.js App Router instead of React Router

## Support

For issues or questions, please refer to the documentation or create an issue in the repository.

## License

Proprietary - Internal use only
