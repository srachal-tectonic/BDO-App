import { parseFinancialSpreadsheet } from './lib/parseSpreadsheet';
import * as fs from 'fs';

const buf = fs.readFileSync('sheets/New BDO Prequal Ben 5.6.26 - SMAPLE SPREADS.xlsx');
const r = parseFinancialSpreadsheet(buf);
console.log('period count:', r.periods.length);
r.periods.forEach((p, i) => {
  console.log(
    `Period${i + 1}`,
    'label=' + JSON.stringify(p.periodLabel),
    'statementDate=' + JSON.stringify(p.statementDate),
    'dcr=' + JSON.stringify(p.debtCoverageRatio),
    'globalDcr=' + JSON.stringify(p.globalDebtCoverageRatio),
  );
});
