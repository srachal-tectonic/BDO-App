# Individual Applicant Fields

## MODIFIED Requirements

### Requirement: Plan to be On-Site Field
The Plan to be On-Site field MUST allow users to provide a detailed explanation of how they plan to manage the distance to the business.

#### Scenario: User views Plan to be On-Site field
Given an individual applicant card is expanded
When the user views the Plan to be On-Site field
Then the field is displayed as a textarea (not a dropdown)
And the placeholder text reads "Please explain how you plan to manage the distance"

#### Scenario: User enters plan to be on-site details
Given an individual applicant card is expanded
When the user types in the Plan to be On-Site textarea
Then the text is saved to the applicant's planToBeOnSite property
And the textarea allows multi-line input
