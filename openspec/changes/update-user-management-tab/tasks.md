# Tasks: Update Firebase Users Tab to User Management

## 1. Rename Tab
- [x] 1.1 Rename TabsTrigger from "Firebase Users" to "User Management"
- [x] 1.2 Update TabsContent value if needed
- [x] 1.3 Update CardTitle in the tab content

## 2. Add User Modal
- [x] 2.1 Add state for modal open/close
- [x] 2.2 Add state for new user form fields (firstName, lastName, email, phone, role)
- [x] 2.3 Create "Add User" button in the card header
- [x] 2.4 Create Dialog component for Add User modal
- [x] 2.5 Add form fields: First Name, Last Name, Email, Phone
- [x] 2.6 Add Role dropdown with options: BDO, BDO Manager, Credit Executive, BDA

## 3. Implement User Creation
- [x] 3.1 Create handleAddUser function
- [x] 3.2 Validate required fields (at minimum: email, role)
- [x] 3.3 Create user document in Firestore users collection
- [x] 3.4 Refresh user list after successful creation
- [x] 3.5 Close modal and reset form on success
- [x] 3.6 Handle errors appropriately

## 4. Testing
- [ ] 4.1 Verify tab is renamed to "User Management"
- [ ] 4.2 Verify "Add User" button opens modal
- [ ] 4.3 Verify all form fields are present and functional
- [ ] 4.4 Verify role dropdown has correct options
- [ ] 4.5 Verify user creation works and appears in list
