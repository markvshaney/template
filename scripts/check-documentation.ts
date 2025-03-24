import { glob } from 'glob';
import { readFileSync } from 'fs';

interface DocCheck {
  pattern: string;
  required: string[];
  exclude?: string[];
}

const docChecks: DocCheck[] = [
  {
    pattern: 'src/**/*.ts',
    required: ['@description', '@param', '@returns'],
    exclude: ['**/*.test.ts', '**/*.d.ts'],
  },
  {
    pattern: 'src/**/*.tsx',
    required: ['@description', '@param', '@returns'],
    exclude: ['**/*.test.tsx'],
  },
  {
    pattern: 'src/**/*.test.ts',
    required: ['@description', '@test'],
  },
  {
    pattern: 'src/**/*.test.tsx',
    required: ['@description', '@test'],
  },
];

async function checkDocumentation() {
  console.log('Checking documentation compliance...');

  for (const check of docChecks) {
    const files = await glob(check.pattern, {
      ignore: check.exclude || [],
    });

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const missing = check.required.filter((req) => !content.includes(req));

      if (missing.length > 0) {
        console.error(`\n❌ Missing documentation in ${file}:`);
        missing.forEach((req) => console.error(`  - Missing ${req}`));
        process.exit(1);
      }
    }
  }

  console.log('\n✅ All documentation checks passed!');
}

checkDocumentation().catch((error) => {
  console.error('Error checking documentation:', error);
  process.exit(1);
});
