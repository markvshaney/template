# CI/CD Pipeline Documentation

## Overview

This document provides comprehensive information about the Continuous Integration and Continuous Deployment (CI/CD) pipeline for the AI Memory System. The pipeline is built with GitHub Actions and includes various automated checks, tests, and deployments.

## Workflows

### 1. Component Tests (`test.yml`)

This workflow runs tests for all components in the application.

#### Triggers

- Push to `main` branch
- Pull requests to `main` branch
- Manual trigger (workflow_dispatch)

#### Features

- Matrix testing with multiple Node.js versions (18.x, 20.x)
- Dependency caching for faster builds
- Comprehensive test coverage reporting via CodeCov
- Artifact uploads for test results and coverage reports

#### How to Run Locally

```bash
npm run test:ci
```

### 2. Visual Regression Tests (`visual-regression.yml`)

This workflow ensures the visual appearance of UI components remains consistent.

#### Triggers

- Push to `main` branch
- Pull requests to `main` branch
- Manual trigger (workflow_dispatch)

#### Features

- Storybook build and testing
- Percy integration for visual diffing
- Artifact uploads for the Storybook build

#### How to Run Locally

```bash
npm run build-storybook
npm run percy:snapshot
```

### 3. Performance Testing (`performance.yml`)

This workflow checks the performance and bundle size of the application.

#### Triggers

- Push to `main` branch
- Pull requests to `main` branch
- Manual trigger with customizable URL (workflow_dispatch)

#### Features

- Lighthouse CI for performance metrics
- Bundle size analysis with thresholds
- Performance budgets for various metrics

#### How to Run Locally

```bash
npx lighthouse http://localhost:3000 --view
npx size-limit
```

## Configuration Files

### 1. Jest Configuration

- `jest.config.cjs`: Main Jest configuration
- `jest.config.ci.ts`: CI-specific Jest configuration with:
  - Optimized settings for CI environment
  - Coverage thresholds
  - Reduced parallelism

### 2. Performance Testing Configuration

- `lighthouse-budget.json`: Budget thresholds for resources and metrics
- `lighthouse-config.json`: Lighthouse CI configuration
- `.size-limit.json`: Bundle size limits for different parts of the application

### 3. Environment Configuration

- `.env.ci`: CI-specific environment variables

## Best Practices for Development

1. **Run Tests Locally Before Pushing**

   ```bash
   npm run test
   ```

2. **Check Bundle Size**

   ```bash
   npx size-limit
   ```

3. **Verify Storybook Components**
   ```bash
   npm run storybook
   ```

## Troubleshooting Common Issues

### 1. Test Failures

- Check for database connection issues
- Verify mock implementations
- Look for timing-related failures in async tests

### 2. Visual Regression Failures

- Review Percy snapshots to identify visual changes
- Check theme-specific styling issues
- Verify responsive behavior across breakpoints

### 3. Performance Issues

- Check for large dependencies
- Look for inefficient component re-renders
- Verify image optimization settings

## Adding New Tests

### 1. Component Tests

Place component tests in `__tests__/components/` directory with a `.test.tsx` extension.

### 2. Storybook Stories

Add stories in component directories with a `.stories.tsx` extension.

### 3. Custom Performance Metrics

Update `lighthouse-budget.json` to include new metrics or adjust existing thresholds.
