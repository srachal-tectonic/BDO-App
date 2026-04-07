## ADDED Requirements

### Requirement: Fee Configurations Management
The Admin Settings Default Values tab SHALL provide a Fee Configurations section that allows administrators to configure standard fee types with default values and conditions.

#### Scenario: View fee configurations table
- **WHEN** an administrator navigates to Admin Settings > Default Values tab
- **THEN** a "Fee Configurations" section is displayed below the WSJ Prime Rate section
- **AND** a table shows all configured fees with columns: Fee Name, Amount, Includes Real Estate, Description, Active
- **AND** an "Add Fee Configuration" button is displayed above the table

#### Scenario: Add new fee configuration
- **WHEN** an administrator clicks the "Add Fee Configuration" button
- **THEN** a modal dialog opens with a form containing the following fields:
  - Fee Name dropdown (required) with options: Good Faith Deposit, SBA Guarantee Fee, Packaging Fee, Appraisal Fee, Environmental Fee, Title Insurance, Legal Fees
  - Amount input field (required, numeric)
  - Condition: Includes Real Estate? dropdown with options: Yes, No
  - Description text field (optional)
  - Active toggle switch defaulting to Yes
- **AND** the administrator can save the fee configuration
- **AND** the new fee appears in the table

#### Scenario: Edit existing fee configuration
- **WHEN** an administrator clicks the edit button on a fee configuration row
- **THEN** a modal dialog opens pre-populated with the fee configuration data
- **AND** the administrator can modify any field
- **AND** upon saving, the table reflects the updated values

#### Scenario: Delete fee configuration
- **WHEN** an administrator clicks the delete button on a fee configuration row
- **THEN** a confirmation prompt appears
- **AND** upon confirmation, the fee configuration is removed from the table

#### Scenario: Validation on save
- **WHEN** an administrator attempts to save a fee configuration without a Fee Name
- **THEN** a validation error is displayed indicating Fee Name is required
- **WHEN** an administrator attempts to save with an invalid or negative amount
- **THEN** a validation error is displayed indicating Amount must be a positive number

### Requirement: Fee Configuration Data Persistence
The system SHALL persist fee configurations to Firebase Firestore as part of the admin settings document.

#### Scenario: Save fee configurations to Firebase
- **WHEN** an administrator adds, edits, or deletes a fee configuration and clicks the main Save button
- **THEN** the fee configurations are saved to the `adminSettings/config` document in Firestore
- **AND** the `feeConfigurations` array contains all configured fees

#### Scenario: Load fee configurations on page load
- **WHEN** an administrator navigates to the Admin Settings page
- **THEN** the previously saved fee configurations are loaded from Firestore
- **AND** displayed in the Fee Configurations table

### Requirement: Fee Configuration Data Model
The fee configuration data model SHALL include the following fields:
- `id`: Unique identifier (string)
- `feeName`: One of the predefined fee types (string, required)
- `amount`: Fee amount in dollars (number, required)
- `includesRealEstate`: Whether the fee applies when real estate is included (boolean)
- `description`: Optional description of the fee (string)
- `active`: Whether the fee configuration is active (boolean)

#### Scenario: Fee configuration structure
- **WHEN** a fee configuration is stored
- **THEN** it contains an `id` field with a unique identifier
- **AND** a `feeName` field with one of: "Good Faith Deposit", "SBA Guarantee Fee", "Packaging Fee", "Appraisal Fee", "Environmental Fee", "Title Insurance", "Legal Fees"
- **AND** an `amount` field with a numeric value
- **AND** an `includesRealEstate` field with a boolean value
- **AND** a `description` field with a string value (may be empty)
- **AND** an `active` field with a boolean value
