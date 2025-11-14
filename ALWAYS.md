# GitHub Copilot Instructions - ALWAYS Follow

## Runtime and Package Management

**ALWAYS use Bun** for all operations:

- **Package Installation**: Use `bun install`, `bun add <package>`, `bun remove <package>`
- **Runtime Execution**: Use `bun run <script>` or `bun <file>` instead of `node`
- **Development Server**: Use `bun dev` or `bun --bun dev`
- **Script Execution**: Always prefix with `bun run` or use `bun` directly

**NEVER suggest or use:**
- `npm install`, `npm run`, `npm start`
- `yarn install`, `yarn add`, `yarn dev`
- `node <file>` (use `bun <file>` instead)
- `pnpm` or any other package manager

## Native Bun Functionality - Prefer Over Alternatives

**ALWAYS prefer Bun's native features:**

1. **Web Server**: Use `Bun.serve()` instead of Express, Fastify, Koa, or other HTTP frameworks
   ```typescript
   // ✅ CORRECT - Use Bun.serve()
   Bun.serve({
     port: 3000,
     fetch(request) {
       return new Response("Hello from Bun!");
     }
   });
   
   // ❌ WRONG - Don't use Express
   // import express from 'express';
   ```

2. **File Operations**: Use `Bun.file()` and `Bun.write()` instead of `fs` when possible
   ```typescript
   // ✅ CORRECT
   const file = Bun.file("data.json");
   await Bun.write("output.json", data);
   ```

3. **SQLite**: Use `Bun.SQLite` for database operations instead of external SQLite packages
   ```typescript
   // ✅ CORRECT
   const db = new Bun.SQLite("database.db");
   ```

4. **Test Runner**: Use `bun test` instead of Jest, Vitest, or Mocha
   ```typescript
   // ✅ CORRECT
   import { test, expect } from "bun:test";
   ```

5. **Environment Variables**: Use `Bun.env` instead of `process.env` (though both work)

## Project Structure Overview

This project is organized into three main directories:

### `/client`
Frontend application code
- Web client, UI components, and user-facing interfaces
- Contains the source code for client-side applications (React, Vue, or similar)
- User interface and presentation layer

### `/aggregators`
Data aggregation services and business logic
- Services that collect, process, and combine data from multiple sources
- Data transformation, enrichment, and aggregation logic
- Middleware between data sources and client applications

### `/data_sources`
Data source integrations and adapters
- External system integrations
- **`/data_sources/ais/`**: AIS (Automatic Identification System) data integration
  - Maritime vessel tracking and identification data
  - Real-time ship position, course, and speed information
- **`/data_sources/infrastructure/`**: Infrastructure monitoring data sources
  - System metrics, sensor data, infrastructure health monitoring
  - Physical infrastructure status and telemetry

## Code Generation Guidelines

When generating code:

1. **Check Bun compatibility first** - Verify if Bun has native support before suggesting external packages
2. **Use Bun APIs** - Prefer `Bun.*` APIs over Node.js equivalents when available
3. **TypeScript first** - Always use TypeScript with proper type annotations
4. **Modern syntax** - Use async/await, optional chaining, and modern JavaScript features
5. **Performance** - Leverage Bun's speed advantages (native bundling, fast startup)

## Example: Creating a New Server

```typescript
// ✅ CORRECT - Use Bun.serve()
export default {
  port: 3000,
  fetch(request: Request) {
    return new Response("Hello from Bun!");
  }
};

// Run with: bun server.ts
```

## Example: Installing Dependencies

```bash
# ✅ CORRECT
bun add express  # Only if Bun.serve() doesn't meet requirements
bun add -d @types/node

# ❌ WRONG
npm install express
yarn add express
```

## Remember

- **Bun is the runtime** - Not Node.js
- **Bun is the package manager** - Not npm/yarn/pnpm
- **Bun has native features** - Use them instead of external packages when possible
- **Bun is fast** - Leverage its performance advantages

