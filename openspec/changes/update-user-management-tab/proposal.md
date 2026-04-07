# Change: Update Firebase Users Tab to User Management with Add User Modal

## Why
The current "Firebase Users" tab only displays existing users and allows deletion. Administrators need the ability to add new users directly from the Admin Settings interface with proper role assignment. Additionally, "User Management" is a more user-friendly name than "Firebase Users".

## What Changes
- Rename "Firebase Users" tab to "User Management"
- Add "Add User" button to the tab header
- Create modal dialog for adding new users with fields:
  - First Name
  - Last Name
  - Email
  - Phone
  - Role (dropdown with options: BDO, BDO Manager, Credit Executive, BDA)
- Implement user creation functionality

## Impact
- Affected specs: admin-settings
- Affected code:
  - `app/bdo/admin/page.tsx` - Rename tab, add modal, implement user creation
