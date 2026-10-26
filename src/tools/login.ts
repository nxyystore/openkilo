import { tool } from '@opencode-ai/plugin';
import { clearAuth, isAuthenticated, loginWithApiKey, loginWithOAuth } from '../auth/index.js';

export const kiloLoginTool = tool({
  description:
    'Authenticate with Kilo to access paid models. Supports API key or OAuth browser flow. Free models work without authentication.',
  args: {
    method: tool.schema
      .enum(['oauth', 'api-key'])
      .optional()
      .default('oauth')
      .describe('Authentication method: "oauth" (browser) or "api-key"'),
    apiKey: tool.schema.string().optional().describe('API key (required if method is "api-key")'),
  },
  async execute(args) {
    if (args.method === 'api-key') {
      if (!args.apiKey) {
        return 'Error: API key is required when using api-key method. Usage: kilo_login --method api-key --api-key YOUR_KEY';
      }
      const result = await loginWithApiKey(args.apiKey as string);
      return result.success
        ? `✓ ${result.message}\n\nYou now have access to all Kilo models including paid ones.`
        : `✗ ${result.message}`;
    }

    const result = await loginWithOAuth();
    return result.success
      ? `✓ ${result.message}\n\nYou now have access to all Kilo models including paid ones.`
      : `✗ ${result.message}`;
  },
});

export const kiloLogoutTool = tool({
  description:
    'Clear stored Kilo authentication credentials. You will still have access to free models.',
  args: {},
  async execute() {
    const wasAuthenticated = await isAuthenticated();
    await clearAuth();

    if (wasAuthenticated) {
      return '✓ Logged out successfully. Free models will still be available.';
    }
    return 'No authentication was stored. Free models are available without login.';
  },
});

export const kiloStatusTool = tool({
  description: 'Check Kilo authentication status and available models.',
  args: {},
  async execute() {
    const auth = await isAuthenticated();

    if (auth) {
      const authData = await import('../auth/storage.js').then((m) => m.loadAuth());
      if (authData.type === 'api-key') {
        return '✓ Authenticated with API key\n\nAll Kilo models (free + paid) are available.';
      }
      if (authData.type === 'oauth') {
        const email = authData.email ?? 'unknown';
        const expired = await import('../auth/storage.js').then((m) =>
          m.isTokenExpired(authData.expiresAt)
        );
        const status = expired ? ' (token expired, will refresh on use)' : '';
        return `✓ Authenticated as ${email}${status}\n\nAll Kilo models (free + paid) are available.`;
      }
    }

    return '✗ Not authenticated\n\nFree models are available without login. Use kilo_login to access paid models.';
  },
});
