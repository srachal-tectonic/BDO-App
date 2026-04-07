# Change Proposal: Improve SBA Form 159 Extraction Feedback

## Summary

When uploading SBA Form 159 PDFs, all extracted field values display as "-" in the UI. Investigation reveals the **extraction code is working correctly** - the issue is that uploaded PDFs often have empty form fields (blank templates or improperly saved filled forms).

## Problem Statement

Users upload SBA Form 159 PDFs through the Borrower Portal expecting to see extracted data. The system:
1. ✅ Correctly detects the form type as SBA 159
2. ✅ Successfully maps all 47 fields to the correct application fields
3. ✅ Correctly reads field values (they are actually empty)
4. ❌ Displays "-" without explaining WHY fields are empty

The UI shows "47 mapped fields" but all values are "-", which is confusing to users who think extraction failed.

## Root Cause Analysis (CONFIRMED)

Running `scripts/diagnose-pdf-extraction.mjs` on the PDF confirms:
- PDF is a standard AcroForm (not XFA)
- 47 fields detected correctly
- **45 fields are empty** (no data filled in)
- Only 2 fields have values: "Applicant" = "0", "SBA Lender_2" = "0"

The extraction is **working correctly**. The PDFs being uploaded are either:
1. Blank templates (not filled out)
2. Filled visually but saved without field data (appearance streams only)
3. Flattened after filling (field data converted to static graphics)

## Proposed Solution

1. **Better empty form detection** - Warn when >80% of mapped fields are empty
2. **Clear user messaging** - Explain that the PDF appears to be blank or improperly saved
3. **Guidance for borrowers** - Suggest using Adobe Acrobat/Reader to fill and save forms
4. **Show extraction statistics** - Display "X of Y fields have values" prominently

## Impact

- **Users affected**: All users uploading PDF forms
- **Features affected**: Borrower Forms section, PDF extraction workflow
- **Risk level**: Low - UI/messaging changes only

## Success Criteria

- Users understand why extraction shows "-" for empty fields
- Clear guidance on how to properly fill and save PDF forms
- Statistics show actual filled vs empty field counts
