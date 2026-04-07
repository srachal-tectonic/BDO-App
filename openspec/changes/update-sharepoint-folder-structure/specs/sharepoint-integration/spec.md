# SharePoint Integration - Folder Structure Update

## ADDED Requirements

### Requirement: Project Folder Subfolders

The system SHALL create a standardized subfolder structure within each project's SharePoint folder.

When a project folder is created, the system SHALL automatically create the following subfolders inside the main project folder:
1. **Business Applicant** - For documents related to the primary business applicant
2. **Other Businesses** - For documents related to other businesses owned by applicants
3. **Project Files** - For general project-related documents

The resulting folder structure SHALL be:
```
[Parent Path]/
└── [Project Name]/
    ├── Business Applicant/
    ├── Other Businesses/
    └── Project Files/
```

#### Scenario: New project folder creation

- **WHEN** the system creates a new SharePoint folder for a project
- **THEN** the system SHALL create the main folder named after the project
- **AND** the system SHALL create three subfolders inside the main folder: "Business Applicant", "Other Businesses", and "Project Files"
- **AND** the system SHALL return IDs for all four folders (main folder and three subfolders)

#### Scenario: Subfolder creation failure

- **WHEN** the main project folder is created successfully but a subfolder fails to create
- **THEN** the system SHALL log the error
- **AND** the system SHALL continue attempting to create remaining subfolders
- **AND** the system SHALL return partial results with available folder IDs

### Requirement: Subfolder References in Firestore

The system SHALL store references to all SharePoint subfolder IDs in the project's Firestore document.

The following fields SHALL be stored:
- `sharepointFolderId` - The main project folder ID (existing)
- `sharepointFolderUrl` - The main project folder URL (existing)
- `sharepointBusinessApplicantFolderId` - The Business Applicant subfolder ID
- `sharepointOtherBusinessesFolderId` - The Other Businesses subfolder ID
- `sharepointProjectFilesFolderId` - The Project Files subfolder ID

#### Scenario: Storing subfolder references

- **WHEN** a project folder with subfolders is created in SharePoint
- **THEN** the system SHALL save the main folder ID and URL to Firestore
- **AND** the system SHALL save all subfolder IDs to the project document in Firestore

#### Scenario: Auto-creation stores subfolder references

- **WHEN** the files API auto-creates a SharePoint folder for a project
- **THEN** the system SHALL create the complete folder structure with subfolders
- **AND** the system SHALL save all folder and subfolder IDs to Firestore
