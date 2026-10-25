import { defineConfig } from 'vitest/config';

// The balance bot: `npm run balance` (BALANCE_HOURS=1 for a quicker look). Not part of `npm test`.
export default defineConfig({
  test: {
    include: ['tests/balance/**/*.sim.ts'],
    environment: 'node',
    testTimeout: 600_000,
  },
});
