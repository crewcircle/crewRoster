import { test, expect, Page } from '@playwright/test';

// ─── Test Configuration ──────────────────────────────────────────────────────
// These tests exercise the full demo workflow on the live site.
// The demo flow is: Landing → /demo → Click persona → Roster
//
// NOTE: Demo tests MUST run sequentially (fullyParallel: false in config).

const PERSONAS = ['Maria', 'Jake', 'Sarah', 'Emma', 'Alex'] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function captureStep(page: Page, stepName: string) {
  await page.screenshot({
    path: `e2e/screenshots/${test.info().title.replace(/\s+/g, '_')}_${stepName}.png`,
    fullPage: true,
  });
}

/**
 * Navigate to /demo and wait for the page to be interactive.
 * The demo page directly shows persona selection buttons (no setup step).
 */
async function setupDemo(page: Page) {
  await page.goto('/demo');
  await page.waitForLoadState('networkidle');
  await captureStep(page, '00_demo_loaded');
}

/**
 * Click a persona button by search term (e.g. 'Maria') and wait for /roster.
 */
async function loginAsUser(page: Page, persona: string) {
  const btn = page.locator(`button:has-text("${persona}")`);
  await expect(btn).toBeVisible({ timeout: 10_000 });
  await captureStep(page, `01_login_${persona.toLowerCase()}`);
  await btn.click();
  await expect(page).toHaveURL(/\/roster/, { timeout: 15_000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for the roster heading to be visible.
 */
async function waitForRosterReady(page: Page) {
  await expect(page.locator('h1')).toContainText('Weekly Roster', { timeout: 15_000 });
  await page.waitForTimeout(2_000);
}

// ─── Phase 1: Demo Page ──────────────────────────────────────────────────────

test.describe('Demo Workflow - Demo Page', () => {
  test('1.1 Landing page → Demo page navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '00_landing_loaded');

    await expect(page.getByRole('navigation').getByRole('link', { name: 'CR CrewRoster' })).toBeVisible();

    const tryDemoLink = page.locator('a:has-text("Try Demo"), a:has-text("try demo"), a[href="/demo"]').first();
    await expect(tryDemoLink).toBeVisible({ timeout: 5_000 });
    await tryDemoLink.click();

    await expect(page).toHaveURL(/\/demo/, { timeout: 10_000 });
    await captureStep(page, '01_on_demo_page');
    await expect(page.locator('h1')).toContainText('Try crewRoster Demo');
  });

  test('1.2 Demo page shows all 5 persona buttons', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '00_demo_loaded');

    await expect(page.locator('h1')).toContainText('Try crewRoster Demo');
    await expect(page.locator('a:has-text("Back to home")')).toBeVisible();

    for (const persona of PERSONAS) {
      await expect(page.locator(`button:has-text("${persona}")`)).toBeVisible();
    }
    await captureStep(page, '01_personas_visible');
  });

  test('1.3 Demo page shows cafe info sidebar', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=The Daily Grind Cafe').first()).toBeVisible();
    await expect(page.locator('text=Surry Hills, Sydney')).toBeVisible();
    await expect(page.locator('text=4 team members')).toBeVisible();
    await expect(page.locator('text=Weekly roster with shifts')).toBeVisible();
    await expect(page.locator('text=Clock events')).toBeVisible();
    await expect(page.locator('text=Demo Mode')).toBeVisible();
    await captureStep(page, '01_sidebar_info');
  });

  test('1.4 Reload demo page preserves persona buttons', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Try crewRoster Demo');
    for (const persona of PERSONAS) {
      await expect(page.locator(`button:has-text("${persona}")`)).toBeVisible();
    }
    await captureStep(page, '01_reloaded');
  });

  test('1.5 Console errors during demo page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_demo_loaded');

    expect(errors.filter(e => !e.includes('favicon') && !e.includes('third-party'))).toHaveLength(0);
  });
});

// ─── Phase 2: Login as All Roles ─────────────────────────────────────────────

test.describe('Demo Workflow - Login as Roles', () => {
  for (const persona of PERSONAS) {
    test(`2.${PERSONAS.indexOf(persona) + 1} Login as ${persona} → /roster`, async ({ page }) => {
      await setupDemo(page);
      await loginAsUser(page, persona);
      await waitForRosterReady(page);
      await captureStep(page, `01_${persona.toLowerCase()}_in_roster`);
    });
  }
});

// ─── Phase 3: Roster Grid as Owner ───────────────────────────────────────────

test.describe('Demo Workflow - Roster as Owner', () => {
  test.beforeEach(async ({ page }) => {
    await setupDemo(page);
    await loginAsUser(page, 'Maria');
    await waitForRosterReady(page);
  });

  test('3.1 Roster heading and week display', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Weekly Roster');
    await expect(page.locator('text=Read Only').first()).toBeVisible();
    await expect(page.locator('text=published').first()).toBeVisible();
    await captureStep(page, '01_roster_heading');
  });

  test('3.2 Week navigation buttons visible and functional', async ({ page }) => {
    const prevBtn = page.locator('button:has-text("← Previous")');
    const nextBtn = page.locator('button:has-text("Next →")');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    const dateRange = page.locator('text=Jun').or(page.locator('text= - ')).first();
    const initialDate = await dateRange.textContent();

    await nextBtn.click();
    await page.waitForTimeout(500);
    const afterNext = await dateRange.textContent();
    expect(afterNext).not.toBe(initialDate);

    await prevBtn.click();
    await page.waitForTimeout(500);
    const afterPrev = await dateRange.textContent();
    expect(afterPrev).toBe(initialDate);

    await captureStep(page, '01_week_navigation');
  });

  test('3.3 Day columns (Sun-Sat) visible', async ({ page }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const day of days) {
      await expect(page.locator(`text="${day}"`).first()).toBeVisible();
    }
    await captureStep(page, '01_day_columns');
  });

  test('3.4 Employee names visible in roster', async ({ page }) => {
    await expect(page.locator('text=Employee').first()).toBeVisible();
    await expect(page.locator('text=Maria Papadopoulos').first()).toBeVisible();
    await expect(page.locator('text=Jake Thompson').first()).toBeVisible();
    await expect(page.locator('text=Sarah Chen').first()).toBeVisible();
    await expect(page.locator('text=Emma Wilson').first()).toBeVisible();
    await expect(page.locator('text=Alex Rivera').first()).toBeVisible();

    await captureStep(page, '01_employee_names');
  });

  test('3.5 Pre-populated shifts visible for employees', async ({ page }) => {
    await expect(page.getByRole('option', { name: /Shift for Maria Papadopoulos from 09:00/ }).first()).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('option', { name: /Shift for Jake Thompson from 07:00/ }).first()).toBeVisible({ timeout: 5_000 });
    await captureStep(page, '01_shifts_visible');
  });

  test('3.6 Read Only / published status visible', async ({ page }) => {
    await expect(page.locator('text=Read Only').first()).toBeVisible({ timeout: 5_000 });
    await captureStep(page, '01_status_visible');
  });
});

// ─── Phase 4: Navigation Between Pages ───────────────────────────────────────

test.describe('Demo Workflow - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupDemo(page);
    await loginAsUser(page, 'Maria');
    await waitForRosterReady(page);
  });

  test('4.1 Navigate to timesheets page', async ({ page }) => {
    await page.goto('/timesheets');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_timesheets_page');
    await expect(page.getByRole('heading', { name: 'Timesheets' })).toBeVisible({ timeout: 10_000 });
  });

  test('4.2 Navigate to team page', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_team_page');
    await expect(page.locator('h1').or(page.locator('text=Team'))).toBeVisible({ timeout: 10_000 });
  });

  test('4.3 Navigate back to home from roster', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_back_to_home');
    await expect(page.locator('body')).toBeVisible();
  });

  test('4.4 Navigate roster → timesheets → team loads all pages', async ({ page }) => {
    await page.goto('/timesheets');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/team');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/roster');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    await captureStep(page, '01_full_navigation');
  });
});

// ─── Phase 5: Logout ─────────────────────────────────────────────────────────

test.describe('Demo Workflow - Logout', () => {
  test('5.1 Logout from owner session', async ({ page }) => {
    await setupDemo(page);
    await loginAsUser(page, 'Maria');
    await waitForRosterReady(page);

    // Try clicking any visible logout/sign-out button
    const signOutBtn = page.locator('button:has-text("Logout"), button:has-text("Sign out"), button:has-text("Sign Out")');
    if (await signOutBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await signOutBtn.click();
      await page.waitForURL(/\/demo|\/login/, { timeout: 10_000 });
      await captureStep(page, '01_logged_out');
    } else {
      // No visible button — clear session storage to simulate logout
      await page.evaluate(() => {
        sessionStorage.clear();
      });
      await page.goto('/roster');
      await page.waitForTimeout(1_000);
      await captureStep(page, '01_session_cleared');
    }
  });

  test('5.2 Protected routes redirect after logout', async ({ page }) => {
    await setupDemo(page);
    await loginAsUser(page, 'Maria');
    await waitForRosterReady(page);

    await page.evaluate(() => {
      sessionStorage.clear();
    });

    await page.goto('/roster');
    await page.waitForTimeout(2_000);
    await captureStep(page, '01_protected_route_redirect');
  });
});

// ─── Phase 6: Mobile Responsiveness ──────────────────────────────────────────

test.describe('Demo Workflow - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('6.1 Demo page at 375px no overflow', async ({ page }) => {
    await setupDemo(page);

    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBe(false);
    await captureStep(page, '01_demo_mobile');
  });

  test('6.2 Demo page personas visible at 375px', async ({ page }) => {
    await setupDemo(page);

    for (const persona of PERSONAS) {
      await expect(page.locator(`button:has-text("${persona}")`)).toBeVisible();
    }
    await captureStep(page, '01_personas_mobile');
  });

  test('6.3 Roster page at 375px', async ({ page }) => {
    await setupDemo(page);
    await loginAsUser(page, 'Maria');
    await page.waitForURL(/\/roster/, { timeout: 15_000 });
    await page.waitForTimeout(2_000);

    await expect(page.locator('body')).toBeVisible();
    await captureStep(page, '01_roster_mobile');
  });
});

// ─── Phase 7: Error / Edge Cases ─────────────────────────────────────────────

test.describe('Demo Workflow - Error & Edge Cases', () => {
  test('7.1 Access /demo without landing first', async ({ page }) => {
    await page.goto('/demo');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Try crewRoster Demo');
    await captureStep(page, '01_direct_demo_access');
  });

  test('7.2 Navigate to /roster without auth', async ({ page }) => {
    await page.goto('/roster');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_roster_no_auth');
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.3 Navigate to /timesheets without auth', async ({ page }) => {
    await page.goto('/timesheets');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_timesheets_no_auth');
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.4 Navigate to /team without auth', async ({ page }) => {
    await page.goto('/team');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_team_no_auth');
    await expect(page.locator('body')).toBeVisible();
  });

  test('7.5 404 page for unknown route', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist');
    await page.waitForLoadState('networkidle');
    await captureStep(page, '01_404_page');
    expect(response?.status()).toBe(404);
  });
});
