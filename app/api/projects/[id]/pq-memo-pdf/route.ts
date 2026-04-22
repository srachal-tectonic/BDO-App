import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/cosmosdb';
import { generatePQMemoHTML } from '@/lib/pq-memo-template';

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let browser: any = null;
  try {
    const { id: projectId } = await params;

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

    const html = generatePQMemoHTML({
      projectName: project.projectName || project.businessName || 'Draft',
      loanApplication: loanApp,
      financialPeriods: periods,
      spreadFileName,
    });

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
    await page.setContent(html, { waitUntil: 'networkidle0' });
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
    const filename = `PQ_Memo_${safeName}.pdf`;

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
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
  }
}
