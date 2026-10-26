import { Plugin } from '@opencode/plugin';
import type { Model, Provider, Plugin as PluginNS } from '@opencode/plugin';
import type { V1PluginInput, V1Hooks } from './v1-types.js';
import {
  kiloLoginTool,
  kiloLogoutTool,
  kiloModelsTool,
  kiloRefreshTool,
  kiloStatusTool,
  toolDefs,
} from './tools/index.js';
import { transformToOpenCodeModels } from './transform.js';
import { getModels, getFreeModels, getAllModels } from './registry.js';
import { isAuthenticated } from './auth/index.js';

export const openkiloV2 = Plugin.define({
  id: 'openkilo',
  async setup(ctx) {
    await registerV2Tools(ctx);
    await registerV2Provider(ctx);
  },
});

async function registerV2Tools(ctx: PluginNS.Context): Promise<void> {
  await ctx.tool.transform((editor) => {
    for (const def of Object.values(toolDefs)) {
      editor.add({
        name: def.name,
        description: def.description,
        input: def.input as unknown as never,
        async execute(input) {
          const result = await def.execute(input as Record<string, unknown>);
          return { content: result };
        },
      });
    }
  });
}

async function registerV2Provider(ctx: PluginNS.Context): Promise<void> {
  const models = await getModels(false);
  const authenticated = await isAuthenticated();

  const filteredModels = authenticated ? getAllModels(models) : getFreeModels(models);
  const openCodeModels = transformToOpenCodeModels(filteredModels);

  await ctx.provider.transform((editor) => {
    editor.add({
      info: {
        id: 'openkilo' as Provider.ID,
        name: 'OpenKilo',
        package: '@openrouter/ai-sdk-provider',
        activation: 'auto',
        settings: {},
        headers: {},
        body: {},
      } as unknown as Provider.Info,
      models: Object.entries(openCodeModels).map(([id, m]) => ({
        id: id as Model.ID,
        modelID: id as Model.ID,
        providerID: 'openkilo' as Provider.ID,
        name: m.name,
        capabilities: { tools: true, input: [], output: [] },
        variants: [],
        time: { released: Date.now() },
        cost: [],
        status: 'active',
        enabled: true,
        limit: {
          context: m.limit?.context ?? 128000,
          input: undefined,
          output: m.limit?.output ?? 8192,
        },
      })) as unknown as Model.Info[],
    });
  });
}

export default {
  ...openkiloV2,
  async server(_input: V1PluginInput): Promise<V1Hooks> {
    return {
      tool: {
        kilo_login: kiloLoginTool,
        kilo_logout: kiloLogoutTool,
        kilo_status: kiloStatusTool,
        kilo_refresh: kiloRefreshTool,
        kilo_models: kiloModelsTool,
      },
      async config(config) {
        config.provider = config.provider ?? {};

        try {
          const models = await getModels(false);
          const authenticated = await isAuthenticated();

          const filteredModels = authenticated ? getAllModels(models) : getFreeModels(models);
          const openCodeModels = transformToOpenCodeModels(filteredModels);

          config.provider.openkilo = {
            name: 'OpenKilo',
            npm: '@openrouter/ai-sdk-provider',
            options: {
              baseURL: 'https://api.kilo.ai/api/openrouter/',
              apiKey: 'anonymous',
            },
            models: openCodeModels,
          };
        } catch (error) {
          console.error('[OpenKilo] Failed to load models:', error);
        }
      },
    };
  },
};
