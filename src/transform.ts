import type { KiloGatewayModel } from './registry.js';

type Modality = 'text' | 'audio' | 'image' | 'video' | 'pdf';

export interface OpenCodeModel {
  name: string;
  limit?: {
    context: number;
    output: number;
  };
  modalities?: {
    input: Modality[];
    output: Modality[];
  };
}

function toModality(value: string): Modality {
  if (
    value === 'text' ||
    value === 'audio' ||
    value === 'image' ||
    value === 'video' ||
    value === 'pdf'
  ) {
    return value;
  }
  return 'text';
}

function transformModel(model: KiloGatewayModel): OpenCodeModel {
  return {
    name: model.name,
    limit: {
      context: model.context_length || model.top_provider?.context_length || 128000,
      output: model.top_provider?.max_completion_tokens || 8192,
    },
    modalities: {
      input: (model.architecture?.input_modalities || ['text']).map(toModality),
      output: (model.architecture?.output_modalities || ['text']).map(toModality),
    },
  };
}

export function transformToOpenCodeModels(
  models: KiloGatewayModel[]
): Record<string, OpenCodeModel> {
  const result: Record<string, OpenCodeModel> = {};

  for (const model of models) {
    result[model.id] = transformModel(model);
  }

  return result;
}
