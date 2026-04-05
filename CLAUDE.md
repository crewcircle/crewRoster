# CrewCircle Development Standards

## Code Size Limits

To maintain code readability and reduce cognitive overhead:

- **max-lines**: 200 lines per file
- **max-lines-per-function**: 30 lines per function
- **complexity**: 8 maximum cyclomatic complexity
- **max-depth**: 4 maximum nesting depth
- **max-params**: 3 maximum parameters per function

## Architecture

CrewCircle uses a monorepo structure with:

- `apps/web` - Next.js frontend application
- `packages/` - Shared packages
- `services/` - Backend services

## Project Structure

```
crewcircle/
├── apps/
│   └── web/           # Next.js frontend
├── packages/          # Shared libraries
├── services/          # Backend services
├── docs/              # Documentation
└── README.md
```

## State Management

- Use Zustand for global state
- Keep state normalized and扁平 (flat)
- Use selectors for derived state

## API Design

- RESTful endpoints under `/api/`
- Use server actions for mutations
- Validate all inputs with Zod

## Testing

- Unit tests for utilities and hooks
- Integration tests for API routes
- E2E tests with Playwright for critical flows

## TypeScript

- Strict mode enabled
- No `any` types
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions

## Code Size Limits

- **Max 200 lines per file** (warn at 200, error at 300)
- **Max 30 lines per function** (warn at 30, error at 50)
- **Complexity ≤ 8** (warn), ≤ 10 (error)
- **Max nesting depth ≤ 4**
- **Max 3 parameters per function**

If code exceeds these limits, REFACTOR immediately using Extract Method, Extract Class, or other patterns.

## Before Generating Code

1. Identify correct layer
2. Follow dependency rules
3. Use services for business logic
4. Keep files under 200 lines, functions under 30 lines
5. Run: `npm run lint`
