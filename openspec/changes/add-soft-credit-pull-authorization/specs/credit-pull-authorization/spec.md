## ADDED Requirements

### Requirement: Soft Credit Pull button is disabled until authorized

The Soft Credit Pull control SHALL be rendered for every individual applicant
but MUST be disabled (greyed-out, non-interactive) by default. It SHALL become
enabled only when a matching, valid credit pull authorization exists for that
applicant and the project has been saved.

#### Scenario: No authorization on file

- **WHEN** an individual applicant has no matching authorization record
- **THEN** the Soft Credit Pull button is visible but disabled
- **AND** its tooltip explains a signed authorization form is required

#### Scenario: Authorization present

- **WHEN** a matching authorization record exists for the applicant and the project is saved
- **THEN** the Soft Credit Pull button is enabled and can open the pull dialog

#### Scenario: Project not yet saved

- **WHEN** the project has not been saved (no project id)
- **THEN** the button remains disabled regardless of authorization status

### Requirement: Zoho authorization webhook ingestion

The system SHALL expose a public HTTP endpoint that accepts POST requests from
Zoho Forms when a Soft Credit Pull Authorization Form is submitted, and SHALL
persist each submission as a credit pull authorization record.

#### Scenario: Valid submission is stored

- **WHEN** Zoho POSTs a submission with a valid shared-secret header
- **THEN** the system stores an authorization record containing the normalized
  name key, the applicant's name, SSN last 4, date of birth, email, phone,
  address, a signature reference, and the source submission id
- **AND** responds with HTTP 200

#### Scenario: Duplicate delivery is idempotent

- **WHEN** Zoho re-delivers a submission with a previously seen submission id
- **THEN** the system does not create a duplicate authorization record
- **AND** still responds with HTTP 200

#### Scenario: Webhook fires automatically per entry

- **WHEN** a borrower submits the Zoho authorization form
- **THEN** the webhook is invoked once for that entry without manual action

### Requirement: Webhook authentication via shared secret

The webhook endpoint MUST reject any request that does not present the
configured shared secret, and MUST NOT require an Auth0 session.

#### Scenario: Missing or wrong secret

- **WHEN** a request arrives without the secret header, or with an incorrect value
- **THEN** the system responds with HTTP 401 and stores no record
- **AND** logs the unauthorized attempt

#### Scenario: Correct secret

- **WHEN** a request presents the correct secret value in the configured header
- **THEN** the request is accepted for processing

### Requirement: Applicant matching by normalized name and date of birth

The system SHALL match an authorization to individual applicants by BOTH a
normalized name key (first + last) AND a normalized date-of-birth key
(`YYYYMMDD`, digits only). The normalizers MUST be shared between the writing
(webhook) and reading (status check) paths so keys are computed identically.

#### Scenario: Name and DOB both match

- **WHEN** an applicant's first/last name and date of birth normalize to the same name key and DOB key as a stored authorization
- **THEN** the applicant is considered authorized

#### Scenario: Normalization ignores formatting differences

- **WHEN** the submitted name differs only by letter case, diacritics, extra whitespace, or a middle name/suffix, AND the DOB differs only by format (e.g. `MM/DD/YYYY` vs ISO `YYYY-MM-DD`)
- **THEN** it still produces the same name key and DOB key as the applicant's record

#### Scenario: Matching name but different DOB does not authorize

- **WHEN** a stored authorization shares the applicant's name key but has a different DOB key
- **THEN** the applicant is NOT authorized and the button remains disabled

#### Scenario: Missing or unparseable DOB does not authorize

- **WHEN** the applicant record or the submission has no parseable date of birth
- **THEN** no match is possible and the button remains disabled

### Requirement: Authorization is permanent and queryable

A stored authorization SHALL remain valid indefinitely (no expiry, not consumed
by performing a pull), and the system SHALL provide an authenticated way for the
UI to check whether a given applicant name is authorized.

#### Scenario: Authorization persists across pulls and sessions

- **WHEN** a matching authorization exists
- **THEN** the button stays enabled across page reloads and after a credit pull is performed

#### Scenario: Authenticated status check

- **WHEN** an authenticated client requests authorization status for an applicant name
- **THEN** the system returns whether an authorization exists and, if so, when it was received

### Requirement: Sensitive data handling

The system MUST minimize storage and logging of sensitive identifiers from the
authorization submission.

#### Scenario: SSN is not stored in full

- **WHEN** a submission containing a full SSN is processed
- **THEN** only the last four digits are persisted
- **AND** the full SSN and raw payload are not written to standard logs in production
