# Git Commit Protocol

## Branch Naming Convention

Branches should follow the format: `type/description`

Types:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `style/` - Code style changes
- `refactor/` - Code refactoring
- `test/` - Adding or modifying tests
- `chore/` - Maintenance tasks

Examples:

- `feature/step-4-jest-setup`
- `fix/login-validation`
- `docs/api-documentation`
- `style/format-components`
- `refactor/database-layer`
- `test/add-integration-tests`
- `chore/update-dependencies`

## Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes
- `refactor` - Code refactoring
- `test` - Adding or modifying tests
- `chore` - Maintenance tasks

### Scope

The scope should be the name of the module affected (as perceived by the person reading the changelog generated from the commits).

### Description

Use the imperative, present tense: "change" not "changed" nor "changes".
Don't capitalize the first letter.
No dot (.) at the end.

### Body

Just as in the description, use the imperative, present tense. The body should include the motivation for the change and contrast this with previous behavior.

### Footer

The footer should contain any information about Breaking Changes and is also the place to reference GitHub issues that this commit Closes.

### Examples

```
feat(auth): add login validation

- Add email format validation
- Add password strength requirements
- Add rate limiting for failed attempts

Closes #123
```

```
fix(api): handle null response from database

- Add null check before accessing properties
- Return appropriate error message
- Update error handling tests

Fixes #456
```

```
docs(readme): update installation instructions

- Add Node.js version requirement
- Update dependency installation steps
- Add troubleshooting section
```

## Commit Process

1. Create feature branch:

   ```bash
   git checkout -b feature/step-X-description
   ```

2. Make changes and commit:

   ```bash
   git add .
   git commit -m "feat(step-X): description"
   ```

3. Push changes:

   ```bash
   git push origin feature/step-X-description
   ```

4. Create pull request:

   - Title: "Step X: Description"
   - Description: Link to step summary and plan
   - Labels: step-X, needs-review

5. Wait for approval

6. Merge after approval:
   ```bash
   git checkout main
   git merge feature/step-X-description
   git push origin main
   ```

## Pre-commit Checks

Before each commit, the following checks will run automatically:

1. Lint check
2. Type check
3. Test run
4. Documentation check
5. Workflow compliance check

To skip checks (not recommended):

```bash
git commit -m "feat(step-X): description" --no-verify
```

## Commit Message Validation

Commit messages are validated against the following rules:

1. Must start with a type
2. Must have a scope in parentheses
3. Must have a description
4. Description must be in present tense
5. No period at the end of description
6. Body must be separated from header by blank line
7. Footer must be separated from body by blank line

Example of a valid commit message:

```
feat(auth): add login validation

- Add email format validation
- Add password strength requirements
- Add rate limiting for failed attempts

Closes #123
```
