# .cursorrules Directory

## Purpose

The `.cursorrules` directory contains documentation and configuration files that provide context and guidance for AI-assisted development. These files help AI tools like Cursor understand the project structure, coding standards, and technical decisions, particularly focusing on the AI memory system and its integration with the web application.

## Contents

- **index.md**: Main entry point with overview of all guidelines
- **typescript.md**: TypeScript coding standards and best practices
- **testing.md**: Testing strategies and guidelines
- **architecture.md**: System architecture overview
- **workflow.md**: Development workflow documentation
- **code_quality.md**: Code quality standards and tools
- **ai_integration.md**: Guidelines for AI model integration
- **database.md**: Database usage and patterns
- **python_js_bridge.md**: Python-JavaScript integration guidelines
- **python_testing.md**: Python-specific testing guidelines
- **python_code_quality.md**: Python code quality standards
- **dev_context.json**: Machine-readable project context for AI tools

## Key Features

### AI Memory System

- Dual-memory architecture (Neocortical and Hippocampal systems)
- Multiple memory specializations with LoRA adapters
- Vector storage integration for fast learning
- Memory management and consolidation

### Development Standards

- TypeScript-first development
- Comprehensive testing strategy
- Code quality enforcement
- Documentation requirements

### Integration Points

- Python-JavaScript bridge for model operations
- Database integration with Prisma
- Vector storage with Supabase
- Real-time communication with WebSocket

## How to Use

1. **For Developers**

   - Review these files to understand project standards and patterns
   - Follow the workflow described in `workflow.md`
   - Use the checklist in `checklist.md` for implementation steps

2. **For AI Tools**

   - These files provide context for AI-assisted development
   - Use `dev_context.json` for machine-readable project state
   - Follow the guidelines for consistent code generation

3. **For Documentation**
   - These files serve as living documentation of project decisions
   - Keep documentation in sync with implementation
   - Update when making significant changes

## Updating Guidelines

When making significant changes to the project structure or standards:

1. Update the relevant files in this directory
2. Ensure `dev_context.json` reflects the current state
3. Keep the documentation in sync with actual implementation
4. Update the checklist in `checklist.md` if needed

## Benefits

- **Consistency**: Ensures consistent coding patterns across the project
- **Onboarding**: Helps new developers understand project standards
- **AI Assistance**: Improves AI tool understanding of project context
- **Documentation**: Serves as living documentation of technical decisions
- **Quality**: Maintains high code quality through enforced standards

## Related Files

- **checklist.md**: Project implementation steps and progress
- **tech_stack.json**: Detailed technical stack information
- **workflow.md**: Detailed workflow instructions
- **CODE_QUALITY.md**: Comprehensive code quality guidelines
