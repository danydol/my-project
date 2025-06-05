import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Go to the login page
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Look for login/auth elements
  // If already logged in, we should see user interface elements
  // If not logged in, we should see login options
  
  try {
    // Check if we're already logged in by looking for user-specific elements
    await page.waitForSelector('[data-testid="user-avatar"], .user-menu, [data-testid="dashboard"]', { timeout: 5000 });
    console.log('Already authenticated');
  } catch {
    // Not logged in, need to authenticate
    console.log('Need to authenticate via GitHub');
    
    // Look for GitHub login button
    const githubLoginButton = page.locator('text="Login with GitHub", [data-testid="github-login"], a[href*="/auth/github"]').first();
    if (await githubLoginButton.isVisible({ timeout: 5000 })) {
      await githubLoginButton.click();
      
      // Wait for GitHub OAuth flow to complete and redirect back
      await page.waitForURL('**/auth/callback*', { timeout: 30000 });
      
      // Wait for the authentication to complete and return to main app
      await page.waitForLoadState('networkidle');
      
      // Verify we're now logged in
      await expect(page.locator('[data-testid="user-avatar"], .user-menu, [data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
    }
  }
  
  // Save signed-in state to 'authFile'
  await page.context().storageState({ path: authFile });
}); 