# Semantic Versioning Guide

Deploy.AI uses [Semantic Versioning (SemVer)](https://semver.org/) to manage versions across the entire platform.

## 📋 Version Format

We follow the **MAJOR.MINOR.PATCH** format:

- **MAJOR**: Breaking changes that are not backward compatible
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes that are backward compatible

## 🚀 Quick Commands

### Automated Releases
```bash
# Patch release (1.0.0 → 1.0.1)
npm run release:patch

# Minor release (1.0.0 → 1.1.0)
npm run release:minor

# Major release (1.0.0 → 2.0.0)
npm run release:major

# Auto-detect version bump based on commits
npm run release
```

### Manual Version Bumps
```bash
# Bump patch version and sync across packages
npm run version:patch

# Bump minor version and sync across packages
npm run version:minor

# Bump major version and sync across packages
npm run version:major
```

### Development
```bash
# Preview what the next release would look like
npm run release:dry-run

# Generate changelog from commits
npm run changelog

# Make a conventional commit
npm run commit
```

## 📝 Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Version Impact |
|------|-------------|----------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `docs` | Documentation | None |
| `style` | Code style (formatting) | None |
| `refactor` | Code refactoring | None |
| `perf` | Performance improvements | Patch |
| `test` | Add/update tests | None |
| `build` | Build system changes | None |
| `ci` | CI/CD changes | None |
| `chore` | Maintenance tasks | None |

### Breaking Changes

Add `BREAKING CHANGE:` in the footer or use `!` after type:

```bash
feat!: redesign authentication system

BREAKING CHANGE: Authentication now requires OAuth tokens
```

### Examples

```bash
# New feature
feat(chat): add message encryption support

# Bug fix
fix(auth): resolve GitHub OAuth callback issue

# Documentation
docs: update deployment guide with new Docker optimization

# Breaking change
feat(api)!: replace REST endpoints with GraphQL

BREAKING CHANGE: All API endpoints have been migrated to GraphQL
```

## 🔄 Automated Workflow

### 1. Development
- Make changes following conventional commits
- Use `npm run commit` for interactive commit creation
- Husky hooks validate commit messages automatically

### 2. Release Process
```bash
# 1. Review changes
npm run release:dry-run

# 2. Create release (auto-detects version bump)
npm run release

# 3. Push changes and tags
git push --follow-tags origin main
```

### 3. What Happens Automatically
- ✅ Version bumped in all `package.json` files
- ✅ `CHANGELOG.md` updated with new changes
- ✅ Git tag created with version number
- ✅ Release commit created
- ✅ Docker image labels updated

## 📊 Version Synchronization

All packages stay synchronized:
- Root `package.json`
- Frontend `package.json`  
- Backend `package.json`
- Docker Compose labels

The `scripts/sync-versions.js` script ensures consistency.

## 🏷️ Git Tags

Tags follow the format: `v1.2.3`

```bash
# List all version tags
git tag -l "v*"

# View specific release
git show v1.0.0
```

## 📋 Release Checklist

Before releasing:

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Security vulnerabilities addressed
- [ ] Performance impact assessed
- [ ] Docker images build successfully

## 🔧 Configuration Files

### `.versionrc.json`
Standard-version configuration for changelog generation and version bumping.

### `scripts/sync-versions.js`
Utility to synchronize versions across all package.json files.

### `.husky/pre-commit`
Runs version sync before commits.

### `.husky/commit-msg`
Validates conventional commit format.

## 🚨 Troubleshooting

### Version Sync Issues
```bash
# Manually sync versions
npm run version:sync
```

### Commit Message Validation
```bash
# Use interactive commit helper
npm run commit

# Or format manually: type(scope): description
```

### Release Rollback
```bash
# Delete local tag
git tag -d v1.2.3

# Delete remote tag  
git push origin :refs/tags/v1.2.3

# Reset to previous commit
git reset --hard HEAD~1
```

## Examples

### Feature Release (1.0.0 → 1.1.0)
```bash
git add .
git commit -m "feat(chat): add real-time message notifications"
npm run release:minor
```

### Hotfix Release (1.1.0 → 1.1.1)
```bash
git add .
git commit -m "fix(auth): resolve token expiration handling"
npm run release:patch
```

### Breaking Change (1.1.1 → 2.0.0)
```bash
git add .
git commit -m "feat(api)!: migrate to GraphQL schema

BREAKING CHANGE: REST API endpoints have been removed"
npm run release:major
```

This system ensures consistent, predictable, and well-documented releases across the entire Deploy.AI platform! 🚀 