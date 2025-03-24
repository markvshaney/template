# Git Hooks Setup

This project uses git hooks via Husky to ensure code quality. However, these hooks may occasionally cause performance issues or hanging, especially when working with AI coding assistants.

## Available Hooks

- **pre-commit**: Runs linting on staged files
- **commit-msg**: Validates commit messages follow conventional commit format
- **pre-push**: Runs type checking, linting, and critical tests

## Skipping Hooks

### Skip Individual Hooks

To skip specific hooks, use environment variables:

```bash
# Skip pre-commit hook
SKIP_PRE_COMMIT=true git commit -m "your message"

# Skip commit message validation
SKIP_COMMIT_MSG=true git commit -m "your message"

# Skip pre-push hook
SKIP_PRE_PUSH=true git push
```

### Using NPM Scripts

We've included convenient npm scripts to skip hooks:

```bash
# Skip all commit hooks
npm run commit:skip-checks -m "your message"

# Skip all push hooks
npm run push:skip-checks
```

### Temporarily Disable All Hooks

Use our helper script to disable all git hooks at once:

```bash
# Disable all git hooks
npm run hooks:disable

# Check hooks status
npm run hooks:status

# Re-enable hooks when you're done
npm run hooks:enable
```

## Troubleshooting

If you experience hanging or performance issues with git hooks:

1. **Disable all hooks** using `npm run hooks:disable`
2. Complete your git operations
3. **Re-enable hooks** using `npm run hooks:enable` when done

## If AI Assistants Hang

When using AI coding assistants like GitHub Copilot or Cursor, git hooks may cause the AI to hang. To prevent this:

1. Disable git hooks before starting your AI coding session
2. If an AI hanging occurs, try disabling hooks and restart the AI assistant
3. For critical work with AI assistance, consider keeping hooks disabled

## Customizing Hooks

If certain hooks continue to cause problems, you can edit the hook scripts in the `.husky` directory to customize their behavior or make them more efficient.

## Note

The hooks have been optimized to work better with AI assistants and prevent hanging issues.
