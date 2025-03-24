# Code Quality Standards

This document outlines the code quality tools and standards used in this project.

## Tools

### ESLint

- TypeScript support
- React and React Hooks rules
- Accessibility (a11y) rules
- Jest testing rules
- Prettier integration

### Prettier

- Consistent code formatting
- Automatic formatting on save
- Integration with ESLint

### Git Hooks

- Pre-commit hooks for code quality checks
- Commit message validation
- Lint-staged for efficient linting
- Pre-push: Runs essential checks before pushing to remote

### VS Code Integration

- Format on save
- ESLint auto-fix
- TypeScript support
- Recommended extensions

## Usage

### Code Formatting

Code is automatically formatted on save in VS Code. You can also format manually:

```bash
# Format all files
npm run format

# Format specific files
npx prettier --write "src/**/*.{ts,tsx}"
```

### Linting

```bash
# Lint all files
npm run lint

# Lint with auto-fix
npm run lint:fix
```

### Git Commits

Commit messages must follow the conventional commits format:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test updates
- `chore:` Maintenance tasks

Example:

```
feat: add user authentication
fix: resolve login redirect issue
docs: update API documentation
```

## Configuration

### ESLint

Configuration is in `.eslintrc.js`. Key features:

- Next.js recommended rules
- TypeScript support
- React and React Hooks rules
- Accessibility rules
- Jest testing rules

### Prettier

Configuration is in `.prettierrc`. Settings:

- Single quotes
- Semicolons
- 100 character line length
- 2 space indentation
- ES5 trailing commas

### Git Hooks

- Pre-commit: Runs lint-staged
- Commit-msg: Validates commit messages
- Pre-push: Runs essential checks before pushing to remote

#### Pre-push Hook

The pre-push hook runs the following checks before allowing code to be pushed:

1. TypeScript type checking
2. Linting on staged files
3. Basic test suite

To skip pre-push checks (use with caution):

```bash
npm run push:skip-checks
```

Note: Skipping pre-push checks should be done only in exceptional circumstances, such as:

- Emergency hotfixes
- Temporary workarounds
- When checks are temporarily broken

## Troubleshooting

### Common Issues

1. **Format on Save Not Working**

   - Ensure Prettier extension is installed
   - Check VS Code settings
   - Verify file type associations

2. **ESLint Errors**

   - Run `npm run lint:fix`
   - Check for conflicting rules
   - Verify TypeScript types

3. **Git Hook Issues**
   - Run `npx husky install`
   - Check hook permissions
   - Verify lint-staged configuration

### Getting Help

1. Check the documentation
2. Review error messages
3. Consult team members
4. Check tool documentation
