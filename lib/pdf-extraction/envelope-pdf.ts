import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';

// ---------------------------------------------------------------------------
// Display maps — copied from @shared/borrowerFormFields (Replit reference).
// Used to translate between internal keys and the human-readable labels that
// the generated envelope PDF stores in its combo-box value slots.
// ---------------------------------------------------------------------------

export const projectRoleDisplayMap: Record<string, string> = {
  'owner-guarantor': 'Owner & Guarantor',
  'owner-non-guarantor': 'Owner Non-Guarantor',
  'non-owner-key-manager': 'Non-Owner Key Manager',
  'other': 'Other',
};

export const ownershipTypeDisplayMap: Record<string, string> = {
  'direct': 'Direct Ownership',
  'indirect': 'Through an Entity',
};

export const businessRoleDisplayMap: Record<string, string> = {
  'active-full-time': 'Active - Full Time',
  'active-part-time': 'Active - Part Time',
  'passive': 'Passive',
};

const reverseProjectRoleMap: Record<string, string> = Object.fromEntries(
  Object.entries(projectRoleDisplayMap).map(([k, v]) => [v, k])
);
const reverseOwnershipTypeMap: Record<string, string> = Object.fromEntries(
  Object.entries(ownershipTypeDisplayMap).map(([k, v]) => [v, k])
);
const reverseBusinessRoleMap: Record<string, string> = Object.fromEntries(
  Object.entries(businessRoleDisplayMap).map(([k, v]) => [v, k])
);

// ---------------------------------------------------------------------------
// Field map — names emitted by the Replit envelope PDF generator → where the
// value lands inside project.data. Kept verbatim from server/utils/envelope-pdf.ts.
// ---------------------------------------------------------------------------

export const ENVELOPE_FIELD_MAP: Record<string, { section: string; path: string; type: string }> = {};

function registerField(name: string, section: string, fieldPath: string, type = 'text') {
  ENVELOPE_FIELD_MAP[name] = { section, path: fieldPath, type };
}

function initFieldMap() {
  registerField('ba_entityToBeFormed', 'businessApplicant', 'entityToBeFormed', 'boolean');
  registerField('ba_legalName', 'businessApplicant', 'legalName', 'text');
  registerField('ba_dba', 'businessApplicant', 'dba', 'text');
  registerField('ba_entityType', 'businessApplicant', 'entityType', 'text');
  registerField('ba_ein', 'businessApplicant', 'ein', 'text');
  registerField('ba_website', 'businessApplicant', 'website', 'text');
  registerField('ba_businessStreet', 'businessApplicant', 'businessAddress.street', 'text');
  registerField('ba_businessCity', 'businessApplicant', 'businessAddress.city', 'text');
  registerField('ba_businessState', 'businessApplicant', 'businessAddress.state', 'text');
  registerField('ba_businessZip', 'businessApplicant', 'businessAddress.zip', 'text');
  registerField('ba_projectStreet', 'businessApplicant', 'projectAddress.street', 'text');
  registerField('ba_projectCity', 'businessApplicant', 'projectAddress.city', 'text');
  registerField('ba_projectState', 'businessApplicant', 'projectAddress.state', 'text');
  registerField('ba_projectZip', 'businessApplicant', 'projectAddress.zip', 'text');
  registerField('ba_otherOwners', 'businessApplicant', 'otherOwners', 'text');

  for (let i = 0; i < 5; i++) {
    const prefix = `ia${i}_`;
    const pathPrefix = `${i}.`;
    const section = 'individualApplicants';
    for (const f of [
      'firstName', 'middleName', 'lastName', 'suffix', 'ssn', 'dateOfBirth', 'militaryVeteran',
      'phone', 'email', 'title', 'projectRole', 'ownershipPercentage', 'ownershipType', 'businessRole',
      'travelTimeToBusiness', 'experience', 'yearsOfExperience', 'estimatedCreditScore',
      'creditScoreExplanation', 'indirectOwnershipDescription', 'planToBeOnSite', 'businessRoleDescription',
    ]) {
      registerField(
        `${prefix}${f}`,
        section,
        `${pathPrefix}${f}`,
        f === 'ssn' ? 'ssn' : f === 'ownershipPercentage' ? 'percentage' : 'text'
      );
    }
    registerField(`${prefix}homeStreet`, section, `${pathPrefix}homeAddress.street`, 'text');
    registerField(`${prefix}homeCity`, section, `${pathPrefix}homeAddress.city`, 'text');
    registerField(`${prefix}homeState`, section, `${pathPrefix}homeAddress.state`, 'text');
    registerField(`${prefix}homeZip`, section, `${pathPrefix}homeAddress.zip`, 'text');

    registerField(`ba_own${i}_firstName`, 'individualApplicants', `${i}.firstName`, 'text');
    registerField(`ba_own${i}_lastName`, 'individualApplicants', `${i}.lastName`, 'text');
    registerField(`ba_own${i}_ownershipPct`, 'individualApplicants', `${i}.ownershipPercentage`, 'percentage');
    registerField(`ba_own${i}_ownershipType`, 'individualApplicants', `${i}.ownershipType`, 'text');
    registerField(`ba_own${i}_projectRole`, 'individualApplicants', `${i}.projectRole`, 'text');
    registerField(`ba_own${i}_businessRole`, 'individualApplicants', `${i}.businessRole`, 'text');

    registerField(`oob${i}_hasOtherBusinesses`, 'otherOwnedBusinesses', `applicant_${i}_hasOtherBusinesses`, 'text');
    for (let b = 0; b < 19; b++) {
      const oobPrefix = `oob${i}_${b}_`;
      const oobSection = 'otherOwnedBusinesses';
      registerField(`${oobPrefix}businessName`, oobSection, `applicant_${i}_biz_${b}_businessName`, 'text');
      registerField(`${oobPrefix}industry`, oobSection, `applicant_${i}_biz_${b}_industry`, 'text');
      registerField(`${oobPrefix}ownerName`, oobSection, `applicant_${i}_biz_${b}_ownerName`, 'text');
      registerField(`${oobPrefix}ownershipPct`, oobSection, `applicant_${i}_biz_${b}_ownershipPct`, 'text');
      registerField(`${oobPrefix}roleInBusiness`, oobSection, `applicant_${i}_biz_${b}_roleInBusiness`, 'text');
      registerField(`${oobPrefix}corporateGuarantor`, oobSection, `applicant_${i}_biz_${b}_corporateGuarantor`, 'text');
    }
  }

  registerField('oob_hasOtherBusinesses', 'otherOwnedBusinesses', 'hasOtherBusinesses', 'text');

  for (let i = 0; i < 5; i++) {
    const prefix = `ia${i}_`;
    const pfsFields = [
      'cashOnHand', 'savingsAccounts', 'iraRetirement', 'accountsReceivable', 'lifeInsuranceCashValue',
      'stocksAndBonds', 'realEstate', 'automobiles', 'otherPersonalProperty', 'otherAssets',
      'accountsPayable', 'notesPayableToBanks', 'installmentAccountAuto', 'installmentAccountOther',
      'loansAgainstLifeInsurance', 'mortgagesOnRealEstate', 'unpaidTaxes', 'otherLiabilities',
      'salary', 'netInvestmentIncome', 'realEstateIncome', 'otherIncome',
      'asEndorserOrCoMaker', 'legalClaimsJudgments', 'provisionFederalIncomeTax', 'otherSpecialDebt',
      'otherPersonalPropertyDescription', 'unpaidTaxesDescription', 'otherLiabilitiesDescription', 'lifeInsuranceDescription',
    ];
    for (const f of pfsFields) {
      registerField(`${prefix}pfs_${f}`, 'personalFinancialStatements', `${i}.${f}`, 'text');
    }

    for (let n = 0; n < 20; n++) {
      for (const f of ['noteholder', 'originalBalance', 'currentBalance', 'paymentAmount', 'frequency', 'collateral']) {
        registerField(`${prefix}pfs_note${n}_${f}`, 'personalFinancialStatements', `${i}.notesPayable.${n}.${f}`, 'text');
      }
    }
    for (let s = 0; s < 20; s++) {
      for (const f of ['numberOfShares', 'nameOfSecurities', 'cost', 'marketValue', 'dateOfQuotation', 'totalValue']) {
        registerField(`${prefix}pfs_sec${s}_${f}`, 'personalFinancialStatements', `${i}.securities.${s}.${f}`, 'text');
      }
    }
    for (let r = 0; r < 10; r++) {
      for (const f of [
        'type', 'address', 'datePurchased', 'originalCost', 'presentMarketValue',
        'mortgageHolder', 'mortgageAccountNumber', 'mortgageBalance', 'monthlyPayment', 'status',
      ]) {
        registerField(`${prefix}pfs_re${r}_${f}`, 'personalFinancialStatements', `${i}.realEstateOwned.${r}.${f}`, 'text');
      }
    }
  }

  for (const key of ['convicted', 'arrested', 'pendingLawsuits', 'childSupport', 'taxLiens', 'bankruptcy', 'federalDebt', 'nonCitizenOwner']) {
    registerField(`sba_${key}_yes`, 'sbaEligibility', key, 'yesno_yes');
    registerField(`sba_${key}_no`, 'sbaEligibility', key, 'yesno_no');
  }
  registerField('sba_eligibilityExplanation', 'sbaEligibility', 'eligibilityExplanation', 'text');

  registerField('po_projectName', 'projectOverview', 'projectName', 'text');
  registerField('po_referralSource', 'projectOverview', 'referralSource', 'text');
  registerField('po_bdo1', 'projectOverview', 'bdo1', 'text');
  registerField('po_bdo2', 'projectOverview', 'bdo2', 'text');
  registerField('po_bda', 'projectOverview', 'bda', 'text');
  registerField('po_industry', 'projectOverview', 'industry', 'text');
  registerField('po_naicsCode', 'projectOverview', 'naicsCode', 'text');
  registerField('po_primaryProjectPurpose', 'projectOverview', 'primaryProjectPurpose', 'text');
  registerField('po_secondaryPurposes', 'projectOverview', 'secondaryProjectPurposes', 'text');
  registerField('po_projectDescription', 'projectOverview', 'projectDescription', 'text');

  registerField('si_legalName', 'sellerInfo', 'legalName', 'text');
  registerField('si_dbaName', 'sellerInfo', 'dbaName', 'text');
  registerField('si_contactName', 'sellerInfo', 'contactName', 'text');
  registerField('si_phone', 'sellerInfo', 'phone', 'text');
  registerField('si_email', 'sellerInfo', 'email', 'text');
  registerField('si_website', 'sellerInfo', 'website', 'text');
  registerField('si_typeOfAcquisition', 'sellerInfo', 'typeOfAcquisition', 'text');
  registerField('si_purchasing100Percent', 'sellerInfo', 'purchasing100Percent', 'text');
  registerField('si_purchaseContractStatus', 'sellerInfo', 'purchaseContractStatus', 'text');
  registerField('si_hasSellerCarryNote', 'sellerInfo', 'hasSellerCarryNote', 'text');
  registerField('si_businessDescription', 'sellerInfo', 'businessDescription', 'text');
}

initFieldMap();

// ---------------------------------------------------------------------------
// Extraction — pull the form-field values out of a filled PDF.
// Uses instanceof checks rather than duck typing so Turbopack/Webpack bundlers
// don't break on mangled constructor names.
// ---------------------------------------------------------------------------

/**
 * Coerce whatever pdf-lib returns for a /V entry into a plain JS string.
 */
function pdfValToString(v: any): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  try {
    if (typeof v.decodeText === 'function') return v.decodeText() ?? '';
    if (typeof v.asString === 'function') return v.asString() ?? '';
    if (typeof v.value === 'string') return v.value;
  } catch {
    /* best-effort */
  }
  return '';
}

/**
 * Pull the raw PDF string value out of a field's underlying AcroForm dictionary.
 * Fallback path for when the typed helpers (getText / getSelected) return empty.
 * Tries the parent field's /V first, then each widget kid's /V (some viewers
 * write the filled value to the widget annotation instead of the parent field),
 * then each widget's /MK dictionary caption as a last resort.
 */
function readRawDictValue(field: any): string {
  try {
    const acro = field?.acroField;
    if (!acro) return '';

    // Step 1: parent field's /V via the typed helper
    if (typeof acro.getValue === 'function') {
      const v = acro.getValue();
      const s = pdfValToString(v);
      if (s) return s;
    }

    // Step 2: walk the widget kids and look for per-widget /V (some viewers
    // write the filled value to the widget annotation rather than the parent).
    const PDFName =
      (acro as any).constructor?.PDFName ??
      (globalThis as any).PDFName;
    const getKey = (key: string) => (PDFName && typeof PDFName.of === 'function' ? PDFName.of(key) : key);
    const dict = acro.dict;
    if (dict && typeof dict.lookup === 'function') {
      // Parent field /V raw
      const parentV = dict.lookup(getKey('V'));
      const parentStr = pdfValToString(parentV);
      if (parentStr) return parentStr;

      // Walk /Kids if present
      const kids = dict.lookup(getKey('Kids'));
      const kidsArr = kids && typeof (kids as any).asArray === 'function' ? (kids as any).asArray() : [];
      for (const kidRef of kidsArr) {
        const kid = typeof (kidRef as any).lookup === 'function' ? kidRef : dict.context?.lookup?.(kidRef);
        if (!kid || typeof kid.lookup !== 'function') continue;
        const kidV = kid.lookup(getKey('V'));
        const kidStr = pdfValToString(kidV);
        if (kidStr) return kidStr;
      }
    }

    // Step 3: try pdf-lib's widget list (some versions expose .getWidgets())
    if (typeof acro.getWidgets === 'function') {
      try {
        const widgets = acro.getWidgets();
        for (const w of widgets) {
          const wDict = (w as any)?.dict;
          if (!wDict || typeof wDict.lookup !== 'function') continue;
          const wV = wDict.lookup(getKey('V'));
          const s = pdfValToString(wV);
          if (s) return s;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* swallow — best-effort fallback */
  }
  return '';
}

export async function extractEnvelopePdfFields(pdfBuffer: Buffer | Uint8Array): Promise<Record<string, any>> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const extracted: Record<string, any> = {};

  for (const field of fields) {
    const name = field.getName();
    let value: any = '';
    try {
      if (field instanceof PDFDropdown) {
        const selected = field.getSelected();
        value = Array.isArray(selected) ? (selected.length > 0 ? selected[0] : '') : (selected || '');
      } else if (field instanceof PDFRadioGroup) {
        value = field.getSelected() || '';
      } else if (field instanceof PDFCheckBox) {
        value = field.isChecked();
      } else if (field instanceof PDFTextField) {
        value = field.getText() || '';
      }

      // Fallback: if the typed read returned empty, try the raw dictionary.
      // Skips checkboxes (boolean) — they're already correct.
      if ((value === '' || value == null) && !(field instanceof PDFCheckBox)) {
        const raw = readRawDictValue(field);
        if (raw) value = raw;
      }
    } catch {
      value = '';
    }
    extracted[name] = value;
  }

  return extracted;
}

// ---------------------------------------------------------------------------
// Remap helpers — reposition a `ia0_*` / `oob0_*` / `ia0_pfs_*` block onto a
// different applicant index after extraction. Useful when the user uploads a
// single-applicant envelope and wants it applied to applicant #2, #3, etc.
// ---------------------------------------------------------------------------

export function remapIndividualApplicantFields(
  extractedFields: Record<string, any>,
  targetIndex: number
): Record<string, any> {
  const remapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(extractedFields)) {
    if (key.startsWith('ia0_')) {
      const suffix = key.slice(4);
      remapped[`ia${targetIndex}_${suffix}`] = value;
    } else if (key.startsWith('oob0_')) {
      const suffix = key.slice(5);
      remapped[`oob${targetIndex}_${suffix}`] = value;
    }
  }
  return remapped;
}

export function remapPfsFieldsForApplicant(
  extractedFields: Record<string, any>,
  sourceIndex: number,
  targetIndex: number
): Record<string, any> {
  const remapped: Record<string, any> = {};
  const srcPrefix = `ia${sourceIndex}_pfs_`;
  const tgtPrefix = `ia${targetIndex}_pfs_`;
  for (const [key, value] of Object.entries(extractedFields)) {
    if (key.startsWith(srcPrefix)) {
      const suffix = key.slice(srcPrefix.length);
      remapped[`${tgtPrefix}${suffix}`] = value;
    }
  }
  return remapped;
}

// ---------------------------------------------------------------------------
// Apply — merge extracted fields into an existing project.data object.
// Returns a NEW object; the input is not mutated.
// ---------------------------------------------------------------------------

export function applyEnvelopeFieldsToData(
  existingData: any,
  extractedFields: Record<string, any>
): any {
  const data = JSON.parse(JSON.stringify(existingData || {}));

  const oobFlat: Record<string, any> = {};

  for (const [fieldName, value] of Object.entries(extractedFields)) {
    if (value === '' || value === null || value === undefined) continue;

    const mapping = ENVELOPE_FIELD_MAP[fieldName];
    if (!mapping) continue;

    const { section, path: fieldPath, type } = mapping;

    if (section === 'questionnaireResponses') continue;

    let processedValue: any = value;
    if (type === 'boolean') {
      processedValue = !!value;
    }

    if (type === 'yesno_yes') {
      if (value === true || value === 'On') {
        processedValue = 'Yes';
      } else {
        continue;
      }
    }

    if (type === 'yesno_no') {
      if (value === true || value === 'On') {
        processedValue = 'No';
      } else {
        continue;
      }
    }

    if (fieldName === 'ba_entityType' && typeof processedValue === 'string') {
      const entityTypeMap: Record<string, string> = {
        'Cooperative': 'cooperative',
        'Corporation': 'corporation',
        'Limited Liability Company (LLC)': 'llc',
        'Limited Liability Partnership': 'llp',
        'Partnership': 'partnership',
        'Sole Proprietorship': 'sole-proprietor',
        'Subchapter S Corporation': 's-corp',
        'Trust': 'trust',
      };
      processedValue = entityTypeMap[processedValue] || processedValue;
    }

    if (fieldName.endsWith('_projectRole') && typeof processedValue === 'string') {
      processedValue = reverseProjectRoleMap[processedValue] || processedValue;
    }

    if (fieldName.endsWith('_ownershipType') && typeof processedValue === 'string') {
      processedValue = reverseOwnershipTypeMap[processedValue] || processedValue;
    }

    if (fieldName.endsWith('_businessRole') && typeof processedValue === 'string') {
      processedValue = reverseBusinessRoleMap[processedValue] || processedValue;
    }

    if (fieldName === 'po_secondaryPurposes' && typeof processedValue === 'string') {
      processedValue = processedValue.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (
      (fieldName.endsWith('_dateOfQuotation') ||
        fieldName.endsWith('_datePurchased') ||
        fieldName.endsWith('_dateOfBirth')) &&
      typeof processedValue === 'string'
    ) {
      const match = processedValue.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (match) {
        const month = match[1].padStart(2, '0');
        const day = match[2].padStart(2, '0');
        processedValue = `${match[3]}-${month}-${day}`;
      }
    }

    if (section === 'otherOwnedBusinesses') {
      oobFlat[fieldPath] = processedValue;
      continue;
    }

    if (section === 'personalFinancialStatements') {
      if (!data.personalFinancialStatements) data.personalFinancialStatements = {};
      const pfsParts = fieldPath.split('.');
      const appIdx = parseInt(pfsParts[0]);
      const applicant = data.individualApplicants?.[appIdx];
      const applicantId = applicant?.id || `applicant-${appIdx + 1}`;
      if (!data.personalFinancialStatements[applicantId]) data.personalFinancialStatements[applicantId] = {};
      const pfsObj = data.personalFinancialStatements[applicantId];
      const subParts = pfsParts.slice(1);

      if (subParts.length === 1) {
        pfsObj[subParts[0]] = processedValue;
      } else if (subParts.length === 3) {
        const arrayField = subParts[0];
        const arrIdx = parseInt(subParts[1]);
        const prop = subParts[2];
        if (!Array.isArray(pfsObj[arrayField])) pfsObj[arrayField] = [];
        while (pfsObj[arrayField].length <= arrIdx) pfsObj[arrayField].push({});
        pfsObj[arrayField][arrIdx][prop] = processedValue;
      }
      continue;
    }

    if (!data[section]) data[section] = {};

    const parts = fieldPath.split('.');
    let target = data[section];

    if (section === 'individualApplicants') {
      if (!Array.isArray(data.individualApplicants)) data.individualApplicants = [{}];
      const idx = parseInt(parts[0]);
      while (data.individualApplicants.length <= idx) {
        data.individualApplicants.push({ id: `imported-${Date.now()}-${data.individualApplicants.length}` });
      }
      if (!data.individualApplicants[idx].id) {
        data.individualApplicants[idx].id = `imported-${Date.now()}-${idx}`;
      }
      target = data.individualApplicants[idx];
      const subParts = parts.slice(1);
      for (let i = 0; i < subParts.length - 1; i++) {
        if (!target[subParts[i]]) target[subParts[i]] = {};
        target = target[subParts[i]];
      }
      target[subParts[subParts.length - 1]] = processedValue;
      continue;
    }

    for (let i = 0; i < parts.length - 1; i++) {
      if (!target[parts[i]]) target[parts[i]] = {};
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = processedValue;
  }

  if (Object.keys(oobFlat).length > 0) {
    if (!data.otherOwnedBusinesses) data.otherOwnedBusinesses = {};

    if (oobFlat.hasOtherBusinesses) {
      data.otherOwnedBusinesses.hasOtherBusinesses = oobFlat.hasOtherBusinesses;
    }

    const businesses: any[] = data.otherOwnedBusinesses.businesses || [];

    for (let appIdx = 0; appIdx < 5; appIdx++) {
      const appHasKey = `applicant_${appIdx}_hasOtherBusinesses`;
      if (oobFlat[appHasKey]) {
        const hasOtherVal = oobFlat[appHasKey];
        if (hasOtherVal === 'Yes' || hasOtherVal === 'yes') {
          data.otherOwnedBusinesses.hasOtherBusinesses = 'Yes';
        }
      }

      for (let bizIdx = 0; bizIdx < 19; bizIdx++) {
        const bizPrefix = `applicant_${appIdx}_biz_${bizIdx}_`;
        const bizName = oobFlat[`${bizPrefix}businessName`];
        if (!bizName) continue;

        const applicant = data.individualApplicants?.[appIdx];
        const ownerName =
          oobFlat[`${bizPrefix}ownerName`] ||
          (applicant ? `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() : '');
        const pctStr = oobFlat[`${bizPrefix}ownershipPct`] || '';
        const pctNum = pctStr ? parseFloat(String(pctStr).replace(/[%\s]/g, '')) : 0;
        const corpGuarantor = oobFlat[`${bizPrefix}corporateGuarantor`];

        businesses.push({
          id: `imported-oob-${Date.now()}-${appIdx}-${bizIdx}`,
          businessName: bizName,
          industry: oobFlat[`${bizPrefix}industry`] || '',
          corporateGuarantor: corpGuarantor === 'Yes' || corpGuarantor === 'yes',
          ownershipPercentages: [
            {
              ownerName,
              percentage: isNaN(pctNum) ? 0 : pctNum,
              roleInBusiness: oobFlat[`${bizPrefix}roleInBusiness`] || '',
            },
          ],
        });
      }
    }

    data.otherOwnedBusinesses.businesses = businesses;
  }

  return data;
}

// Collect any questionnaire responses stored in q_<ruleId> fields.
export function extractQuestionnaireResponses(
  extractedFields: Record<string, any>
): Array<{ ruleId: string; content: string }> {
  const responses: Array<{ ruleId: string; content: string }> = [];
  for (const [fieldName, value] of Object.entries(extractedFields)) {
    if (!fieldName.startsWith('q_') || !value) continue;
    const ruleId = fieldName.replace('q_', '');
    responses.push({ ruleId, content: String(value) });
  }
  return responses;
}
