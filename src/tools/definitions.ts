import { clearAuth, isAuthenticated, loginWithApiKey, loginWithOAuth } from '../auth/index.js';
import { getAllModels, getFreeModels, getModels } from '../registry.js';

export interface ToolDef {
  name: string;
  description: string;
  input: Record<string, unknown>;
  execute(args: Record<string, unknown>): Promise<string>;
}

export const kiloLoginDef: ToolDef = {
  name: 'kilo_login',
  description:
    'Authenticate with Kilo to access paid models. Supports API key or OAuth browser flow. Free models work without authentication.',
  input: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['oauth', 'api-key'],
        default: 'oauth',
        description: 'Authentication method: "oauth" (browser) or "api-key"',
      },
      apiKey: {
        type: 'string',
        description: 'API key (required if method is "api-key")',
      },
    },
    additionalProperties: false,
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
};

export const kiloLogoutDef: ToolDef = {
  name: 'kilo_logout',
  description:
    'Clear stored Kilo authentication credentials. You will still have access to free models.',
  input: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    const wasAuthenticated = await isAuthenticated();
    await clearAuth();

    if (wasAuthenticated) {
      return '✓ Logged out successfully. Free models will still be available.';
    }
    return 'No authentication was stored. Free models are available without login.';
  },
};

export const kiloStatusDef: ToolDef = {
  name: 'kilo_status',
  description: 'Check Kilo authentication status and available models.',
  input: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
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
};

export const kiloRefreshDef: ToolDef = {
  name: 'kilo_refresh',
  description: 'Force refresh the Kilo model registry from Kilo Gateway',
  input: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  async execute() {
    try {
      const models = await getModels(true);
      const freeModels = getFreeModels(models);

      return `✓ Model registry refreshed\n\nFound ${freeModels.length} free models available without authentication.`;
    } catch (error) {
      return `✗ Failed to refresh models: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

export const kiloModelsDef: ToolDef = {
  name: 'kilo_models',
  description: 'List available Kilo models (free models only if not authenticated)',
  input: {
    type: 'object',
    properties: {
      filter: {
        type: 'string',
        enum: ['free', 'all'],
        default: 'free',
        description: 'Show "free" models or "all" models (requires authentication)',
      },
    },
    additionalProperties: false,
  },
  async execute(args) {
    try {
      const models = await getModels(false);
      const filtered = args.filter === 'all' ? getAllModels(models) : getFreeModels(models);

      if (filtered.length === 0) {
        return 'No models found.';
      }

      const lines = filtered.slice(0, 50).map((m) => `  ${m.id}: ${m.name}`);

      const remaining = filtered.length > 50 ? `\n  ... and ${filtered.length - 50} more` : '';

      return `Available models (${filtered.length}):\n${lines.join('\n')}${remaining}`;
    } catch (error) {
      return `✗ Failed to list models: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};

export const toolDefs: Record<string, ToolDef> = {
  kilo_login: kiloLoginDef,
  kilo_logout: kiloLogoutDef,
  kilo_status: kiloStatusDef,
  kilo_refresh: kiloRefreshDef,
  kilo_models: kiloModelsDef,
};
