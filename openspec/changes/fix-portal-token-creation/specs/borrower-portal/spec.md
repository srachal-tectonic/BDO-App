# Spec Delta: Borrower Portal - Fix Token Creation

## MODIFIED Requirements

### Requirement: Portal Token Creation
The system SHALL create secure portal tokens for borrower access with proper authentication, authorization, and error handling.

#### Scenario: Successful token creation with authentication
- **WHEN** an authenticated BDO requests a new portal token for a project they own
- **THEN** the system verifies the user's authentication token
- **AND** verifies the user has access to the specified project
- **AND** creates a new cryptographically secure token
- **AND** stores the token in Firestore atomically with project update
- **AND** returns the token and expiration date to the client

#### Scenario: Token creation fails due to missing authentication
- **WHEN** an unauthenticated request attempts to create a portal token
- **THEN** the system returns a 401 Unauthorized response
- **AND** does not create any token in Firestore

#### Scenario: Token creation fails due to project access denied
- **WHEN** an authenticated user requests a token for a project they don't own
- **THEN** the system returns a 403 Forbidden response
- **AND** does not create any token in Firestore

#### Scenario: Token creation fails due to Firestore error
- **WHEN** the Firestore write operation fails
- **THEN** the system logs the detailed error server-side
- **AND** returns a 500 error response with generic message
- **AND** in development mode, includes error details in response
- **AND** ensures no partial data is written (atomic operation)

#### Scenario: Token creation with CSRF protection
- **WHEN** a POST request is made without valid CSRF token (when CSRF is enabled)
- **THEN** the system returns a 403 Forbidden response
- **AND** does not process the token creation request

### Requirement: Portal Token Revocation
The system SHALL allow authenticated users to revoke portal tokens they created.

#### Scenario: Successful token revocation with authentication
- **WHEN** an authenticated BDO requests to revoke a portal token
- **THEN** the system verifies the user's authentication
- **AND** marks the token as revoked in Firestore
- **AND** clears the token reference from the project
- **AND** returns a success response

## ADDED Requirements

### Requirement: Portal Token Error Diagnostics
The system SHALL provide detailed error logging for portal token operations to aid debugging.

#### Scenario: Detailed server-side error logging
- **WHEN** any portal token operation fails
- **THEN** the system logs the error message, stack trace, project ID, and user ID
- **AND** the logs are accessible in the server console/monitoring system

#### Scenario: Development mode error details
- **WHEN** a portal token operation fails in development mode
- **THEN** the system includes error details in the API response
- **AND** helps developers identify the root cause quickly
