import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

interface WorkflowCheck {
  name: string;
  check: () => boolean;
  error: string;
}

const checks: WorkflowCheck[] = [
  {
    name: 'Step Documentation',
    check: () => {
      const stepNumber = process.env.STEP_NUMBER;
      if (!stepNumber) {
        console.error('STEP_NUMBER environment variable is not set');
        return false;
      }
      const summaryPath = join('docs/checklist_step_summaries', `step_${stepNumber}_summary.md`);
      return existsSync(summaryPath);
    },
    error: 'Step summary documentation is missing',
  },
  {
    name: 'AI-Enhanced Plan',
    check: () => {
      const stepNumber = process.env.STEP_NUMBER;
      if (!stepNumber) {
        console.error('STEP_NUMBER environment variable is not set');
        return false;
      }
      const planPath = join('docs/plans', `step_${stepNumber}_plan.md`);
      return existsSync(planPath);
    },
    error: 'AI-enhanced plan is missing',
  },
  {
    name: 'Test Coverage',
    check: () => {
      const coveragePath = join('coverage', 'coverage-final.json');
      if (!existsSync(coveragePath)) {
        return false;
      }
      // Add coverage threshold check here
      return true;
    },
    error: 'Test coverage report is missing or below threshold',
  },
  {
    name: 'TypeScript Check',
    check: () => {
      try {
        execSync('npm run type-check', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    error: 'TypeScript check failed',
  },
  {
    name: 'Lint Check',
    check: () => {
      try {
        execSync('npm run lint', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    },
    error: 'Lint check failed',
  },
];

function runChecks() {
  console.log('Running workflow compliance checks...');
  const failures = checks.filter((check) => !check.check());

  if (failures.length > 0) {
    console.error('\n❌ Workflow compliance check failed:');
    failures.forEach((failure) => console.error(`  - ${failure.error}`));
    process.exit(1);
  }

  console.log('\n✅ All workflow compliance checks passed!');
}

runChecks();
