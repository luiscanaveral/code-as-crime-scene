# Anti-Patterns Detected by Code as Crime Scene

## Architecture

### Blob Architecture
A single module or directory dominates the codebase (>40% of total lines). This indicates too many responsibilities concentrated in one area, making the system rigid and hard to evolve.

### Anemic Domain Model
Domain objects that are mere data bags — classes with far more fields than methods. The behavior that should live in the domain model is instead scattered across services, leading to procedural code.

### Service Locator Anti-Pattern
Heavy use of service locators (`getService()`, `container.resolve()`, etc.) instead of explicit dependency injection. This hides dependencies, makes testing harder, and obscures the component graph.

### Spaghetti Code
Files with excessive nesting depth, very long functions, or high cyclomatic complexity. Such code is difficult to reason about, test, and modify safely.

### Lava Flow
Large blocks of commented-out code, dead-code markers (`TODO: remove`, `@deprecated`), and obsolete artifacts left in the codebase. This increases cognitive load and maintenance burden.

### Golden Hammer
Heavy overuse of a single design pattern or technology (e.g., singletons, factories, static methods). A familiar solution applied universally, even when simpler alternatives exist.

---

## Object-Oriented Programming

### Singleton Abuse
Excessive use of the singleton pattern (private constructors + static instance accessors). Singletons introduce global state and tight coupling, making code harder to test and reason about.

### Feature Envy
Methods that call out to other objects' methods far more than their own. The behavior is in the wrong class — it covets the data of another class and should be moved there.

### Refused Bequest
Subclasses that override most of their parent's methods or rarely call `super`. The subclass rejects its inherited contract, indicating the hierarchy is misaligned.

### Parallel Inheritance Hierarchies
Files in different directories with the same base name that always change together. Adding a class in one hierarchy forces a parallel addition in another, creating a fragile coupling.

### Object Cesspool
Object pooling or instance reuse patterns combined with mutable state. Reused objects can leak data between requests, causing hard-to-debug contamination bugs.

---

## JavaScript / TypeScript

### Massive Component
Frontend components (React, Vue, Svelte) exceeding 200+ lines with many JSX elements, state hooks, and event handlers. Large components are harder to test, reuse, and understand.

### Prop Drilling
Props passed through multiple intermediate components that merely forward them to deeper children. This creates unnecessary coupling between layers and makes refactoring harder.

### Global State Abuse
Heavy reliance on global state (Redux stores, Context providers, module-level variables, `window.*`). Global state makes data flow hard to trace and introduces unpredictable interactions.

### Callback Hell
Deeply nested callbacks, promise chains (`.then().then().then()`), or pyramid-of-doom patterns. These obscure the sequential flow of the program and make error handling fragile.

---

## Security

### Hardcoded Secrets
API keys, passwords, tokens, private keys, or connection strings embedded directly in source code. These should be in environment variables or a secrets manager.

### Broken Authorization Boundaries
Routes, endpoints, or handlers defined without authentication or authorization checks. This leaves the system vulnerable to unauthorized access.

### Trusting Client Input
User-supplied data (`req.body`, `req.query`, URL params) used directly without validation, sanitization, or escaping. This opens the door to injection attacks, XSS, and path traversal.

---

## Cyclic Dependencies

### Cyclic Dependencies (SCCs)
Strongly Connected Components in the module dependency graph — groups of files that depend on each other (directly or transitively). Cycles increase coupling and prevent independent development, testing, and deployment.

### Instability
A module's instability is `fan-out / (fan-in + fan-out)`. Modules with high instability depend on many other modules and are easily affected by changes elsewhere. Stable modules (low instability) are depended on by many others.

### Package Tangle Index
Measures how tangled a package or module is with cyclic dependencies. A high tangle index indicates the module participates in many cycles, making it harder to extract or reuse independently.
