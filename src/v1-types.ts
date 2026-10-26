export interface V1PluginInput {
  client: unknown;
  project: unknown;
  directory: string;
  worktree: string;
  $: unknown;
}

export interface V1Hooks {
  tool: Record<string, unknown>;
  config?: (config: { provider?: Record<string, unknown> }) => Promise<void>;
}

export interface V1Tool {
  description: string;
  args: Record<string, unknown>;
  execute(args: unknown): Promise<string>;
}
