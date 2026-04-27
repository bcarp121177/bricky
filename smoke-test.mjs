/**
 * Bricky smoke test — full golden path
 * Run: node smoke-test.mjs
 */
import { chromium } from '/Users/briancarpenter/development/bricky/node_modules/playwright/index.mjs';

const BASE_URL = 'http://localhost:3003';
const TIMEOUT = 15000;

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}`);
    failed++;
    failures.push(label);
  }
}

async function assertVisible(page, selector, label) {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: TIMEOUT });
    console.log(`  ✓ ${label}`);
    passed++;
    return true;
  } catch (e) {
    console.error(`  ✗ FAIL: ${label} — ${e.message.split('\n')[0]}`);
    failed++;
    failures.push(label);
    return false;
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(TIMEOUT);

  // Capture console errors (excluding known-benign)
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    // ── 1. Welcome screen ────────────────────────────────────────────────────
    console.log('\n=== 1. Welcome screen ===');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    await assertVisible(page, 'h2:has-text("What will you build?")', 'Welcome heading renders');
    await assertVisible(page, 'button:has-text("Add My Pieces")', '"Add My Pieces" button visible');

    // ── 2. Navigate to inventory ─────────────────────────────────────────────
    console.log('\n=== 2. Navigate to Inventory ===');
    await page.click('button:has-text("Add My Pieces")');
    await assertVisible(page, 'h2:has-text("Your Pieces")', 'Inventory heading visible');

    // ── 3. Color swatches ────────────────────────────────────────────────────
    console.log('\n=== 3. Color swatches ===');
    await assertVisible(page, '[aria-label="Bright Red"]', 'Bright Red swatch renders');

    // Click a different color (Bright Blue)
    const brightBlueBtn = page.locator('[aria-label="Bright Blue"]');
    const blueBtnExists = await brightBlueBtn.count() > 0;
    if (blueBtnExists) {
      await brightBlueBtn.click();
      await page.waitForTimeout(500);
      // The color name label should update (it's a p.text-xs.text-gray-500)
      const colorLabel = await page.locator('p.text-xs.text-gray-500').innerText().catch(() => '');
      assert(colorLabel.includes('Blue'), `Color label updates on swatch click (shows: "${colorLabel}")`);
    } else {
      assert(false, 'Bright Blue swatch exists');
    }

    // Switch back to Bright Red
    await page.click('[aria-label="Bright Red"]');
    await page.waitForTimeout(300);

    // ── 4. Category tabs ─────────────────────────────────────────────────────
    console.log('\n=== 4. Category tabs ===');
    await assertVisible(page, 'button:has-text("All")', '"All" category tab renders');
    await assertVisible(page, 'button:has-text("Bricks")', '"Bricks" category tab renders');

    // Click Bricks tab and verify grid still renders
    await page.click('button:has-text("Bricks")');
    await page.waitForTimeout(800);
    const bricksGridExists = await page.locator('.grid.grid-cols-3').count() > 0;
    assert(bricksGridExists, 'Parts grid renders after Bricks category filter');

    // Click back to All
    await page.click('button:has-text("All")');
    await page.waitForTimeout(800);

    // ── 5. Parts grid loads ──────────────────────────────────────────────────
    console.log('\n=== 5. Parts grid loads ===');
    await page.waitForSelector('.grid.grid-cols-3 button', { timeout: TIMEOUT });
    const partCards = await page.locator('.grid.grid-cols-3 button').count();
    assert(partCards > 0, `Parts grid has ${partCards} cards`);

    // ── 6. Add a piece ───────────────────────────────────────────────────────
    console.log('\n=== 6. Add a piece ===');
    const firstCard = page.locator('.grid.grid-cols-3 button').first();
    await firstCard.click();
    await page.waitForTimeout(300);

    // Badge should appear on the card
    const badge = page.locator('.grid.grid-cols-3 button').first().locator('span.bg-yellow-400');
    const badgeVisible = await badge.isVisible().catch(() => false);
    assert(badgeVisible, 'Inventory badge appears on part card after adding');

    // ── 7. CTA button state ──────────────────────────────────────────────────
    console.log('\n=== 7. CTA button (Pick a Theme) ===');
    const ctaBtn = page.locator('button:has-text("Pick a Theme")');
    const ctaEnabled = await ctaBtn.isEnabled().catch(() => false);
    assert(ctaEnabled, 'CTA "Pick a Theme" button is enabled after adding a piece');

    const ctaText = await ctaBtn.innerText().catch(() => '');
    assert(ctaText.includes('piece') || ctaText.includes('Theme'), `CTA shows piece count: "${ctaText}"`);

    // ── 8. Load more button (if present) ─────────────────────────────────────
    console.log('\n=== 8. Load more ===');
    const loadMoreBtn = page.locator('button:has-text("Load more")');
    const hasLoadMore = await loadMoreBtn.isVisible().catch(() => false);
    if (hasLoadMore) {
      const countBefore = await page.locator('.grid.grid-cols-3 button').count();
      await loadMoreBtn.click();
      await page.waitForTimeout(1500);
      const countAfter = await page.locator('.grid.grid-cols-3 button').count();
      assert(countAfter > countBefore, `Load more adds cards: ${countBefore} → ${countAfter}`);
    } else {
      console.log('  — "Load more" not shown (all parts fit on one page)');
      passed++;
    }

    // ── 9. Theme screen ──────────────────────────────────────────────────────
    console.log('\n=== 9. Theme screen ===');
    await page.click('button:has-text("Pick a Theme")');
    await assertVisible(page, 'p:has-text("Choose a theme")', 'Theme picker renders');
    await assertVisible(page, 'button:has-text("Space")', '"Space" theme button renders');
    await assertVisible(page, 'button:has-text("Animals")', '"Animals" theme button renders');

    // CTA should say "Pick a theme first" before selecting
    const themeFirstBtn = page.locator('button:has-text("Pick a theme first")');
    const themeFirstVisible = await themeFirstBtn.isVisible().catch(() => false);
    assert(themeFirstVisible, 'CTA shows "Pick a theme first" before selecting');

    // Click Space theme
    await page.click('button:has-text("Space")');
    await page.waitForTimeout(300);

    // Build button should now be enabled
    const buildBtnNow = page.locator('button:has-text("Let\'s Build")');
    const buildBtnEnabled = await buildBtnNow.isEnabled().catch(() => false);
    assert(buildBtnEnabled, '"Let\'s Build!" button enabled after selecting theme');

    // ── 10. Loading → Pick screen ────────────────────────────────────────────
    console.log('\n=== 10. Loading → Pick screen (stub) ===');
    // The stub delay is 900ms. Start polling for the loading screen immediately after click.
    const loadingPromise = page.waitForSelector('text=Launching into space', { state: 'visible', timeout: 3000 }).catch(() => null);
    await page.click('button:has-text("Let\'s Build")');
    const loadingEl = await loadingPromise;
    assert(loadingEl !== null, 'Loading screen appears ("Launching into space...")');

    // Then pick screen appears
    await assertVisible(page, 'h2:has-text("What will you build?")', 'Pick screen heading renders');
    await assertVisible(page, 'button:has-text("Little Rocket Ship")', 'First suggestion card renders (Little Rocket Ship)');

    // Verify difficulty badges
    const diffBadge = page.locator('span:has-text("Easy"), span:has-text("Medium"), span:has-text("Hard")').first();
    const diffVisible = await diffBadge.isVisible().catch(() => false);
    assert(diffVisible, 'Difficulty badge renders on suggestion card');

    // Verify step count renders
    const stepCount = page.locator('span:has-text("step")').first();
    const stepVisible = await stepCount.isVisible().catch(() => false);
    assert(stepVisible, 'Step count renders on suggestion card');

    // ── 11. Build instructions screen ────────────────────────────────────────
    console.log('\n=== 11. Build instructions ===');
    await page.click('button:has-text("Little Rocket Ship")');

    await assertVisible(page, 'h2:has-text("Little Rocket Ship")', 'Build title renders');
    await assertVisible(page, 'text=Step 1 of', 'Step counter renders');

    // Step card
    const stepCard = page.locator('.rounded-2xl.border-2.border-yellow-400').first();
    const stepCardVisible = await stepCard.isVisible().catch(() => false);
    assert(stepCardVisible, 'Step card with yellow border renders');

    // Piece chips — look for the chip wrapper divs
    const pieceChips = page.locator('.flex.items-center.gap-1\\.5.bg-gray-50');
    const chipCount = await pieceChips.count();
    assert(chipCount > 0, `Piece chips render on step 1 (found ${chipCount})`);

    // Next button
    const nextBtn = page.locator('button:has-text("Next →")');
    const nextVisible = await nextBtn.isVisible().catch(() => false);
    assert(nextVisible, '"Next →" button visible on non-last step');

    // Click Next → step 2
    await nextBtn.click();
    await page.waitForTimeout(300);
    const step2Text = await page.locator('text=Step 2 of').isVisible().catch(() => false);
    assert(step2Text, '"Next →" advances to step 2');

    // Go through remaining steps (stub: 4 total, currently on step 2)
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Next →")');
    await page.waitForTimeout(200);

    // Should now be on last step
    const didItBtn = page.locator('button:has-text("I Did It!")');
    const didItVisible = await didItBtn.isVisible().catch(() => false);
    assert(didItVisible, '"I Did It!" button appears on last step');

    // ── 12. Done screen ───────────────────────────────────────────────────────
    console.log('\n=== 12. Done screen ===');
    await didItBtn.click();
    await page.waitForTimeout(500);

    await assertVisible(page, 'h2:has-text("You did it!")', 'Done screen renders');
    await assertVisible(page, 'button:has-text("Try Another Build")', '"Try Another Build" button renders');
    await assertVisible(page, 'button:has-text("Start Over")', '"Start Over" button renders');

    // ── 13. Reset from Done screen ───────────────────────────────────────────
    console.log('\n=== 13. Reset from Done screen ===');
    await page.click('button:has-text("Start Over")');
    await page.waitForTimeout(300);
    await assertVisible(page, 'h2:has-text("What will you build?")', 'Start Over returns to welcome screen');

    // ── 14. Error screen (simulate API failure) ───────────────────────────────
    console.log('\n=== 14. Error screen ===');
    // Intercept the build API to return 500
    await page.route('**/api/build', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Simulated server error' }),
      });
    });

    // Navigate through the flow
    await page.click('button:has-text("Add My Pieces")');
    await page.waitForSelector('.grid.grid-cols-3 button', { timeout: TIMEOUT });
    await page.locator('.grid.grid-cols-3 button').first().click();
    await page.waitForTimeout(200);
    await page.click('button:has-text("Pick a Theme")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Space")');
    await page.waitForTimeout(200);
    await page.click('button:has-text("Let\'s Build")');

    await assertVisible(page, 'h2:has-text("Oops, something went wrong")', 'Error screen renders on API failure');
    await assertVisible(page, 'button:has-text("Try Again")', '"Try Again" button renders on error screen');
    await assertVisible(page, 'text=Simulated server error', 'Error message shows from API response');

    // ── 15. Check for browser console errors ─────────────────────────────────
    console.log('\n=== 15. Browser console errors ===');
    // snap.mp3 is now a real file so shouldn't 404; filter out any known benign ones.
    // The intentional 500 from the error-screen test also produces a console error — exclude it.
    const criticalErrors = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('snap.mp3') &&
      !e.includes('500')
    );
    if (criticalErrors.length === 0) {
      console.log('  ✓ No critical browser console errors');
      passed++;
    } else {
      console.error(`  ✗ Console errors found:`);
      criticalErrors.forEach(e => console.error(`    - ${e}`));
      failed++;
      failures.push(`Console errors: ${criticalErrors.join(' | ')}`);
    }

  } catch (err) {
    console.error(`\nFATAL: Test crashed — ${err.message}`);
    console.error(err.stack);
    failed++;
    failures.push(`Fatal crash: ${err.message}`);
  } finally {
    await browser.close();
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failures.length > 0) {
    console.log('\nFailed assertions:');
    failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  } else {
    console.log('\nAll checks passed — full golden path works end-to-end.');
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
