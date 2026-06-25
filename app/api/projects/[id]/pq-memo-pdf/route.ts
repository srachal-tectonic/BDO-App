import { NextRequest, NextResponse } from 'next/server';
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { generatePQMemoHTML, generateBusinessQuestionnaireOnlyHTML } from '@/lib/pq-memo-template';
import {
  filterRuleByProject,
  type QuestionnaireRule,
  type QuestionnaireResponse,
} from '@/lib/questionnairePdf';
import {
  ROBOTO_400_WOFF2_BASE64,
  ROBOTO_400_WOFF_BASE64,
  ROBOTO_700_WOFF2_BASE64,
  ROBOTO_700_WOFF_BASE64,
} from '@/lib/pq-memo-font';

// Font bytes decoded once per process. ~88 KB total. Served to Chromium
// over a loopback HTTP server (see startFontServer) — sparticuz's Chromium
// silently errors on data:-URI @font-face src, so we fall back to http://.
const FONT_BUFFERS: Record<string, Buffer> = {
  'roboto-400.woff2': Buffer.from(ROBOTO_400_WOFF2_BASE64, 'base64'),
  'roboto-400.woff':  Buffer.from(ROBOTO_400_WOFF_BASE64,  'base64'),
  'roboto-700.woff2': Buffer.from(ROBOTO_700_WOFF2_BASE64, 'base64'),
  'roboto-700.woff':  Buffer.from(ROBOTO_700_WOFF_BASE64,  'base64'),
};

// Spin up a throwaway HTTP server on 127.0.0.1:<random port> that serves
// the generated HTML at / and font bytes at /fonts/<name>. Returns the
// URL for page.goto plus the server handle so the caller can close it.
async function startFontServer(html: string): Promise<{ url: string; server: Server }> {
  const server = createServer((req, res) => {
    if (req.url === '/' || req.url === '') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(html);
      return;
    }
    const m = (req.url || '').match(/^\/fonts\/([a-z0-9.-]+)$/i);
    if (m && FONT_BUFFERS[m[1]]) {
      const ct = m[1].endsWith('.woff2') ? 'font/woff2' : 'font/woff';
      res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store' });
      res.end(FONT_BUFFERS[m[1]]);
      return;
    }
    res.writeHead(404);
    res.end();
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  return { url: `http://127.0.0.1:${port}/`, server };
}

// Puppeteer ships with its own Chromium (~150MB). Running on Azure App Service
// Linux requires the Chromium runtime deps (libnss3, libatk-bridge2.0-0,
// libcups2, libdrm2, libgbm1, libasound2, libxshmfence1, libxcomposite1,
// libxdamage1, libxrandr2, libgtk-3-0, fonts-liberation). If those aren't
// present the launch will fail with "cannot open shared object file".
// An alternative is @sparticuz/chromium + puppeteer-core for a smaller binary.
// For now we require `puppeteer` as a runtime dep and fail fast with a clear
// message when the module / browser can't be loaded.

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * GET /api/projects/:id/pq-memo-pdf
 * Streams a generated PQ Memo PDF for the given project.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: any = null;
  let fontServer: Server | null = null;
  let engine: 'sparticuz' | 'puppeteer-full' | 'unknown' = 'unknown';
  try {
    const { id: projectId } = await params;
    // `?section=business-questionnaire` strips the output down to just the
    // Business Questionnaire block (used by the BQ subtab's Export button so
    // it produces the same read-only styling as the full PreQual PDF).
    const section = request.nextUrl.searchParams.get('section');
    const bqOnly = section === 'business-questionnaire';

    // Load the project header row.
    const projectsCol = await getCollection(COLLECTIONS.PROJECTS);
    const project = (await projectsCol.findOne({ id: projectId })) as any;
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Load the flat loan-application doc (projectOverview, businessApplicant, ...).
    const loanAppCol = await getCollection(COLLECTIONS.LOAN_APPLICATIONS);
    const loanAppRaw = (await loanAppCol.findOne({ projectId })) || {};
    const { _id, ...loanApp } = loanAppRaw as any;

    // Pick the active spread (or the most recent one) for the financial comparison table.
    const spreadsCol = await getCollection(COLLECTIONS.FINANCIAL_SPREADS);
    const spreads = await spreadsCol
      .find({ projectId })
      .sort({ uploadedAt: -1 })
      .toArray();
    const latestSpread: any =
      spreads.find((s: any) => s.isActive) || (spreads.length > 0 ? spreads[0] : null);
    const periods: any[] = (latestSpread?.periodData as any[]) || [];
    const spreadFileName: string | undefined = latestSpread?.fileName;

    // ── Business Questionnaire (read-only) ──────────────────────────────
    // Mirrors the in-app Business Questionnaire tab: pull every configured
    // rule, filter to those applicable to *this* project (purpose / NAICS /
    // hidden-by-BDO), pair with stored responses by ruleId. Missing rule
    // set, empty filter set, or absent responses doc all degrade silently.
    const adminCol = await getCollection(COLLECTIONS.ADMIN_SETTINGS);
    const adminDoc = (await adminCol.findOne({ id: 'config' })) as any;
    const allRules: QuestionnaireRule[] = Array.isArray(adminDoc?.questionnaireRules)
      ? (adminDoc.questionnaireRules as QuestionnaireRule[])
      : [];
    const hiddenIds: string[] = Array.isArray(project?.hiddenQuestionnaireRuleIds)
      ? (project.hiddenQuestionnaireRuleIds as string[])
      : [];
    const projectOverviewForRules = (loanApp as any)?.projectOverview ?? {};
    const applicableRules =
      allRules.length > 0
        ? allRules.filter((rule) => filterRuleByProject(rule, projectOverviewForRules, hiddenIds))
        : [];

    const responsesCol = await getCollection(COLLECTIONS.QUESTIONNAIRE_RESPONSES);
    const responses = (await responsesCol.find({ projectId }).toArray()) as Array<
      QuestionnaireResponse & { _id?: unknown }
    >;

    // ── Due Diligence report ────────────────────────────────────────────
    const ddCol = await getCollection(COLLECTIONS.DUE_DILIGENCE_REPORTS);
    const ddDoc = (await ddCol.findOne({ projectId })) as any;

    // Per-section "Risk to the bank" comments, oldest-first so threads read in
    // order; injected after their section in the rendered report.
    const ddCommentsCol = await getCollection(COLLECTIONS.DILIGENCE_COMMENTS);
    const ddComments = (await ddCommentsCol
      .find({ projectId })
      .sort({ createdAt: 1 })
      .toArray()) as any[];

    // Per-category risk-score explanations — persisted on projectOverview
    // (see handleExplanationChange in components/PQMemoForm.tsx). The
    // template renders them under each risk-score card; missing fields
    // degrade to the "No explanation provided" placeholder.
    const po = projectOverviewForRules as any;
    const scoreExplanations: Record<string, string> = {
      repayment: po.riskRepaymentExplanation || '',
      management: po.riskManagementExplanation || '',
      equity: po.riskEquityExplanation || '',
      collateral: po.riskCollateralExplanation || '',
      credit: po.riskCreditExplanation || '',
      liquidity: po.riskLiquidityExplanation || '',
    };

    const rawPrimaryPurpose = (projectOverviewForRules as any)?.primaryProjectPurpose;
    const primaryPurposeArr: string[] = Array.isArray(rawPrimaryPurpose)
      ? rawPrimaryPurpose.filter(Boolean)
      : (rawPrimaryPurpose ? [rawPrimaryPurpose] : []);
    const secondaryPurposes: string[] = Array.isArray(
      (projectOverviewForRules as any)?.secondaryProjectPurposes,
    )
      ? (projectOverviewForRules as any).secondaryProjectPurposes.filter(Boolean)
      : [];

    const templateInput = {
      projectName: project.projectName || project.businessName || 'Draft',
      loanApplication: loanApp,
      financialPeriods: periods,
      spreadFileName,
      scoreExplanations,
      questionnaireRules: applicableRules,
      questionnaireResponses: responses,
      projectPurposes: { primary: primaryPurposeArr, secondary: secondaryPurposes },
      diligenceReport: ddDoc
        ? {
            reportText: String(ddDoc.reportText ?? ''),
            generatedAt: String(ddDoc.generatedAt ?? ''),
            model: ddDoc.model ? String(ddDoc.model) : undefined,
            comments: ddComments.map((c) => ({
              sectionKey: String(c.sectionKey ?? ''),
              authorName: String(c.authorName ?? 'Unknown'),
              content: String(c.content ?? ''),
              createdAt: c.createdAt ? String(c.createdAt) : undefined,
            })),
          }
        : null,
    };
    const html = bqOnly
      ? generateBusinessQuestionnaireOnlyHTML(templateInput)
      : generatePQMemoHTML(templateInput);

    // Load a Chromium launcher. Preference order:
    //   1. @sparticuz/chromium + puppeteer-core  — bundles a Linux-friendly
    //      Chromium built for constrained environments (serverless/PaaS,
    //      Azure App Service, Replit-style Nix sandboxes). Needed here
    //      because stock bundled Chromium dies on crashpad signal setup in
    //      those sandboxes (getsockopt EINVAL / unhandled cmsg).
    //   2. full `puppeteer`                      — standard dev machines
    //      (Windows/macOS, regular Linux desktop) where its bundled Chrome
    //      works out of the box.
    //   3. PUPPETEER_EXECUTABLE_PATH override    — explicit escape hatch.
    // Chromium links libfontconfig and calls FcInit() on startup. On
    // Debian/Ubuntu, /etc/fonts/fonts.conf chains through conf.d/* via
    // <include> directives — and those conf.d entries are SYMLINKS to
    // absolute paths like /usr/share/fontconfig/conf.avail/*.conf. On
    // Azure those targets don't exist (our files are under
    // /home/site/wwwroot/chrome-libs/...), every include fails, FcInit
    // returns FcFalse, Blink's font subsystem refuses to activate
    // typefaces, and every @font-face comes back with status: "error".
    //
    // Bypass that whole layer: write a minimal fonts.conf with NO
    // includes, pointing at bundled fonts + a writable cache dir, and
    // tell fontconfig to use it via FONTCONFIG_FILE.
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');
      const bundledFontDir = '/home/site/wwwroot/chrome-libs/usr/share/fonts';
      if (fs.existsSync(bundledFontDir)) {
        const cacheDir = path.join(os.tmpdir(), 'fontconfig-cache');
        fs.mkdirSync(cacheDir, { recursive: true });
        const confPath = path.join(os.tmpdir(), 'pq-fonts.conf');
        const conf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${bundledFontDir}</dir>
  <cachedir>${cacheDir}</cachedir>
  <alias><family>sans-serif</family><prefer><family>Liberation Sans</family></prefer></alias>
  <alias><family>serif</family><prefer><family>Liberation Serif</family></prefer></alias>
  <alias><family>monospace</family><prefer><family>Liberation Mono</family></prefer></alias>
</fontconfig>`;
        fs.writeFileSync(confPath, conf);
        process.env.FONTCONFIG_FILE = confPath;
        // If we previously set FONTCONFIG_PATH, clear it — fontconfig
        // can treat FONTCONFIG_FILE as relative to FONTCONFIG_PATH on
        // some versions, which would break the absolute path above.
        delete process.env.FONTCONFIG_PATH;
      }
    } catch { /* non-Azure env; leave fontconfig alone */ }

    try {
      let chromium: any = null;
      try {
        chromium = (await import('@sparticuz/chromium')).default;
      } catch {
        chromium = null;
      }

      if (chromium) {
        const puppeteerCore: any = (await import('puppeteer-core')).default;
        // These are no-ops on AWS Lambda but recommended everywhere else —
        // force headless, skip the WebGL/SwiftShader stack we'll never use
        // in a server-side PDF render. Improves cold start + memory use on
        // Azure App Service.
        try { chromium.setHeadlessMode = true; } catch { /* older versions */ }
        try { chromium.setGraphicsMode = false; } catch { /* older versions */ }

        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (await chromium.executablePath());
        browser = await puppeteerCore.launch({
          headless: true,
          executablePath,
          args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
          defaultViewport: chromium.defaultViewport,
        });
        engine = 'sparticuz';
      } else {
        // Fallback to full puppeteer with its bundled Chrome.
        let puppeteerFull: any;
        try {
          // @ts-ignore optional runtime dep
          puppeteerFull = (await import('puppeteer')).default;
        } catch {
          return NextResponse.json(
            {
              error:
                'No PDF engine installed. Run `npm install @sparticuz/chromium puppeteer-core` (recommended) or `npm install puppeteer`.',
            },
            { status: 501 },
          );
        }

        let executablePath: string | undefined = process.env.PUPPETEER_EXECUTABLE_PATH;
        if (!executablePath) {
          try {
            executablePath = puppeteerFull.executablePath();
          } catch {
            executablePath = undefined;
          }
        }

        browser = await puppeteerFull.launch({
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
          ],
        });
        engine = 'puppeteer-full';
      }
    } catch (launchErr: any) {
      // Gather diagnostic info that's genuinely hard to retrieve post-hoc on
      // a platform like Azure App Service. Emitted once to the server log and
      // echoed back to the browser so we can see it in the Network tab.
      const diag: Record<string, any> = {
        message: launchErr?.message,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        cwd: process.cwd(),
        tmpdir: require('os').tmpdir(),
        puppeteerExecutablePathEnv: process.env.PUPPETEER_EXECUTABLE_PATH || null,
        ldLibraryPath: process.env.LD_LIBRARY_PATH || null,
      };
      try {
        const fs = await import('fs');
        const path = await import('path');
        // Walk up from the resolved module file to find the package root.
        // (require.resolve can hand back different shapes depending on the
        // loader — always coerce to string first.)
        const chromiumEntry = String(require.resolve('@sparticuz/chromium'));
        let pkgRoot = path.dirname(chromiumEntry);
        for (let i = 0; i < 6; i++) {
          if (fs.existsSync(path.join(pkgRoot, 'package.json'))) break;
          const parent = path.dirname(pkgRoot);
          if (parent === pkgRoot) break;
          pkgRoot = parent;
        }
        const binDir = path.join(pkgRoot, 'bin');
        diag.chromiumPkgDir = pkgRoot;
        diag.chromiumBinDir = binDir;
        diag.chromiumBinEntries = fs.existsSync(binDir)
          ? fs.readdirSync(binDir).slice(0, 20)
          : '<missing>';
      } catch (introspectErr: any) {
        diag.introspectError = introspectErr?.message;
      }

      // Also confirm the shipped-with-deploy libs actually landed.
      try {
        const fs = await import('fs');
        const libsRoot = '/home/site/wwwroot/chrome-libs';
        diag.chromeLibsRoot = libsRoot;
        diag.chromeLibsExists = fs.existsSync(libsRoot);
        if (diag.chromeLibsExists) {
          const candidates = [
            '/home/site/wwwroot/chrome-libs/usr/lib/x86_64-linux-gnu',
            '/home/site/wwwroot/chrome-libs/lib/x86_64-linux-gnu',
            '/home/site/wwwroot/chrome-libs/usr/lib',
          ];
          diag.chromeLibDirs = candidates.map((d) => ({
            dir: d,
            exists: fs.existsSync(d),
            sampleSoFiles: fs.existsSync(d)
              ? fs
                  .readdirSync(d)
                  .filter((f) => f.startsWith('libnspr') || f.startsWith('libnss') || f.startsWith('libasound'))
                  .slice(0, 10)
              : [],
          }));
        }
      } catch (libCheckErr: any) {
        diag.libCheckError = libCheckErr?.message;
      }
      console.error('[PQ Memo PDF] browser launch failed:', launchErr);
      console.error('[PQ Memo PDF] diagnostic snapshot:', diag);
      return NextResponse.json(
        {
          error: 'Failed to launch headless Chromium.',
          details: launchErr?.message,
          diag,
        },
        { status: 500 },
      );
    }

    const page = await browser.newPage();
    // Capture console + pageerror so we can see font parsing warnings that
    // sparticuz's Chromium emits when it refuses to register a data-URI
    // font. These surface nowhere else — not in the PDF, not in the route
    // response — without an explicit listener.
    const pageLogs: string[] = [];
    page.on('console', (msg: any) => pageLogs.push(`[console.${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err: any) => pageLogs.push(`[pageerror] ${err?.message || err}`));

    // Serve the HTML + fonts to Chromium over loopback HTTP so @font-face
    // src can fetch via http:// (sparticuz Chromium silently errors on
    // data:-scheme font loads). page.goto resolves once networkidle0,
    // which waits for the WOFF2 responses we emit below.
    const { url: pageUrl, server } = await startFontServer(html);
    fontServer = server;
    await page.goto(pageUrl, { waitUntil: 'networkidle0' });
    // Defense-in-depth: networkidle0 doesn't cover the internal font decode
    // step, only network quiescence.
    await page.evaluateHandle('document.fonts.ready');

    // Snapshot what sparticuz Chromium actually did with the @font-face.
    // Emitted as X-PDF-Diag header + server log so we can see it without
    // deploying a separate debug endpoint.
    const fontDiag = await page.evaluate(() => {
      const list: Array<{family:string;weight:string;style:string;status:string}> = [];
      (document as any).fonts.forEach((f: any) => {
        list.push({ family: f.family, weight: String(f.weight), style: f.style, status: f.status });
      });
      const body = document.body;
      const cs = getComputedStyle(body);
      return {
        setStatus: (document as any).fonts.status,
        setSize: (document as any).fonts.size,
        list,
        computedFamily: cs.fontFamily,
        computedColor: cs.color,
        innerTextLen: (body.innerText || '').length,
      };
    });
    (fontDiag as any).fontconfigPath = process.env.FONTCONFIG_PATH || null;
    (fontDiag as any).fontconfigFile = process.env.FONTCONFIG_FILE || null;
    console.log('[PQ Memo PDF] Font diag:', JSON.stringify(fontDiag));
    if (pageLogs.length) console.log('[PQ Memo PDF] Page logs:', pageLogs);

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' },
      printBackground: true,
    });

    const projectOverview = loanApp?.projectOverview || {};
    const businessApplicant = loanApp?.businessApplicant || {};
    const borrowerName: string =
      businessApplicant.legalName ||
      projectOverview.projectName ||
      project.projectName ||
      project.businessName ||
      'Draft';
    const safeName = borrowerName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = bqOnly
      ? `${safeName}_Business_Questionnaire.pdf`
      : `Pre_Qual_${safeName}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-PDF-Engine': engine,
        // HTTP headers have an 8KB-ish cap; clip pageLogs so we never blow it.
        'X-PDF-Diag': JSON.stringify(fontDiag).slice(0, 4000),
        'X-PDF-Page-Logs': pageLogs.join(' | ').slice(0, 2000),
      },
    });
  } catch (error: any) {
    console.error('[PQ Memo PDF] Error generating PDF:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate PDF' },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close().catch((err: any) => console.error('Error closing browser:', err));
    }
    if (fontServer) {
      fontServer.close();
    }
  }
}
