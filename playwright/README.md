# DeployAI E2E Tests

This directory contains end-to-end tests for DeployAI using Playwright.

## Setup

1. Install dependencies:
```bash
cd playwright
npm install
```

2. Install browser binaries:
```bash
npm run install-browsers
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run tests in specific browser
```bash
npm run test:chrome
npm run test:firefox
npm run test:safari
```

### View test report
```bash
npm run report
```

## Test Configuration

- **Base URL**: Set via `BASE_URL` environment variable or defaults to the ngrok URL
- **Browsers**: Chrome, Firefox, Safari
- **Screenshots**: Taken on failure
- **Videos**: Recorded on failure
- **Traces**: Collected on first retry

## Test Files

- `auth.setup.ts` - Authentication setup (logs in via GitHub)
- `connect-github.spec.ts` - Tests for GitHub repository connection functionality

## Environment Variables

Create a `.env` file in the playwright directory to customize settings:

```env
BASE_URL=https://your-ngrok-url.ngrok-free.app
```

## Current Tests

### GitHub Repository Connection
- **Test**: Click Connect from GitHub button
- **Description**: Tests the flow of opening the GitHub repository connection modal
- **Steps**:
  1. Navigate to project page
  2. Go to Repositories tab
  3. Click "Add Repository"
  4. Click "Connect GitHub Repository"
  5. Verify modal opens and displays repositories

### Repository Information Display
- **Test**: Display repository information in GitHub modal
- **Description**: Verifies that repository information (name, description, language, stats) is properly displayed
- **Steps**:
  1. Open GitHub connection modal
  2. Verify repository list loads
  3. Check repository information is displayed
  4. Take screenshots for debugging

## Debugging

- Screenshots are saved to `test-results/` directory
- Test reports are generated in `playwright-report/`
- Use `--debug` flag to step through tests
- Use `--ui` flag for interactive test running

## CI/CD Integration

Tests are configured to run in CI environments with:
- Retry on failure (2 retries in CI)
- Single worker in CI
- HTML reporter for results 