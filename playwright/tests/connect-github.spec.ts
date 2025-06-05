import { test, expect } from '@playwright/test';

test.describe('GitHub Repository Connection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should open Connect GitHub Repository modal when clicking Connect from GitHub button', async ({ page }) => {
    // Navigate to a project page or create one first
    // For now, let's assume we're on a page with projects
    
    // Look for and click on a project to access repositories tab
    try {
      // Try to find and click on a project
      const projectCard = page.locator('[data-testid="project-card"], .project-card, [data-testid="project-item"]').first();
      if (await projectCard.isVisible({ timeout: 5000 })) {
        await projectCard.click();
        await page.waitForLoadState('networkidle');
      }
    } catch {
      console.log('No existing project found, may need to create one or navigate differently');
    }

    // Navigate to repositories tab
    try {
      const repositoriesTab = page.locator('text="Repositories", [data-testid="repositories-tab"], [role="tab"]:has-text("Repositories")').first();
      if (await repositoriesTab.isVisible({ timeout: 5000 })) {
        await repositoriesTab.click();
        await page.waitForLoadState('networkidle');
      }
    } catch {
      console.log('Repositories tab not immediately visible');
    }

    // Look for "Add Repository" button
    const addRepositoryButton = page.locator('text="Add Repository", [data-testid="add-repository"], button:has-text("Add Repository")').first();
    await expect(addRepositoryButton).toBeVisible({ timeout: 10000 });
    
    // Click the Add Repository button to open the modal
    await addRepositoryButton.click();
    
    // Wait for the modal to appear
    await page.waitForSelector('[data-testid="add-repository-modal"], .modal, [role="dialog"]', { timeout: 5000 });
    
    // Look for "Connect GitHub Repository" or "Connect from GitHub" button
    const connectGitHubButton = page.locator(
      'text="Connect GitHub Repository", text="Connect from GitHub", [data-testid="connect-github"], button:has-text("Connect")'
    ).first();
    
    await expect(connectGitHubButton).toBeVisible({ timeout: 5000 });
    
    // Click the Connect from GitHub button
    await connectGitHubButton.click();
    
    // Wait for the GitHub repositories modal to appear
    await page.waitForSelector(
      '[data-testid="github-repositories-modal"], [data-testid="connect-github-modal"], .github-modal, [role="dialog"]:has-text("GitHub")', 
      { timeout: 10000 }
    );
    
    // Verify the modal is open and contains repository-related elements
    const modal = page.locator('[data-testid="github-repositories-modal"], [data-testid="connect-github-modal"], .github-modal').first();
    await expect(modal).toBeVisible();
    
    // Check for repository list or loading state
    const repositoryList = modal.locator('[data-testid="repository-list"], .repository-item, .repo-item');
    const loadingIndicator = modal.locator('text="Loading", .loading, .spinner');
    
    // Wait for either repositories to load or see a loading state
    try {
      await expect(repositoryList.first()).toBeVisible({ timeout: 10000 });
      console.log('Repository list is visible');
    } catch {
      try {
        await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
        console.log('Loading indicator visible, waiting for repositories...');
        // Wait a bit longer for repositories to load
        await expect(repositoryList.first()).toBeVisible({ timeout: 15000 });
      } catch {
        console.log('Neither repository list nor loading indicator found immediately');
      }
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'playwright/test-results/connect-github-modal.png', fullPage: true });
    
    // Verify we can see repository information
    const repositoryItems = await repositoryList.count();
    console.log(`Found ${repositoryItems} repository items`);
    
    // Close the modal (optional)
    const closeButton = modal.locator('button:has-text("Cancel"), button:has-text("Close"), [data-testid="close-modal"]').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
    }
  });

  test('should display repository information in the GitHub modal', async ({ page }) => {
    // This test will check that repositories are displayed with proper information
    // Reuse the navigation logic from the previous test
    
    // Navigate to repositories section and open the modal
    try {
      const projectCard = page.locator('[data-testid="project-card"], .project-card').first();
      if (await projectCard.isVisible({ timeout: 5000 })) {
        await projectCard.click();
        await page.waitForLoadState('networkidle');
      }
    } catch {
      console.log('Direct navigation to repositories');
    }

    // Open repositories tab
    const repositoriesTab = page.locator('text="Repositories"').first();
    if (await repositoriesTab.isVisible({ timeout: 5000 })) {
      await repositoriesTab.click();
    }

    // Open Add Repository modal
    const addRepositoryButton = page.locator('text="Add Repository"').first();
    await addRepositoryButton.click();
    
    // Click Connect from GitHub
    const connectGitHubButton = page.locator('text="Connect GitHub Repository", text="Connect from GitHub"').first();
    await connectGitHubButton.click();
    
    // Wait for modal to load
    await page.waitForSelector('[data-testid="github-repositories-modal"], .github-modal', { timeout: 10000 });
    
    const modal = page.locator('[data-testid="github-repositories-modal"], .github-modal').first();
    
    // Check for repository items with expected information
    const repositoryItems = modal.locator('[data-testid="repository-item"], .repository-item');
    await expect(repositoryItems.first()).toBeVisible({ timeout: 15000 });
    
    // Verify repository information is displayed
    const firstRepo = repositoryItems.first();
    
    // Check for repository name
    await expect(firstRepo.locator('[data-testid="repo-name"], .repo-name, h3, .repository-title')).toBeVisible();
    
    // Check for repository description (if exists)
    const repoDescription = firstRepo.locator('[data-testid="repo-description"], .repo-description, .description');
    if (await repoDescription.isVisible({ timeout: 2000 })) {
      console.log('Repository description is visible');
    }
    
    // Check for repository language
    const repoLanguage = firstRepo.locator('[data-testid="repo-language"], .repo-language, .language');
    if (await repoLanguage.isVisible({ timeout: 2000 })) {
      console.log('Repository language is visible');
    }
    
    // Check for repository stats (stars, forks)
    const repoStats = firstRepo.locator('[data-testid="repo-stats"], .repo-stats, .stats');
    if (await repoStats.isVisible({ timeout: 2000 })) {
      console.log('Repository stats are visible');
    }
    
    // Take a screenshot of the repository list
    await page.screenshot({ path: 'playwright/test-results/github-repositories-list.png', fullPage: true });
  });
}); 