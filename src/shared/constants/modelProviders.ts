import type { ModelProviderId } from '../types/settings.js'

export interface ModelProviderPreset {
  id: ModelProviderId
  label: string
  defaultBaseUrl: string
  defaultModel: string
  apiKeyPlaceholder: string
}

export const MODEL_PROVIDER_PRESETS: ModelProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'qwen',
    label: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    apiKeyPlaceholder: 'sk-...',
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-latest',
    apiKeyPlaceholder: 'sk-ant-...',
  },
  {
    id: 'ollama',
    label: 'Ollama（本地）',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    defaultModel: 'qwen2.5',
    apiKeyPlaceholder: 'ollama（可留空）',
  },
  {
    id: 'custom',
    label: '自定义',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: '',
    apiKeyPlaceholder: 'API Key',
  },
]

export function getProviderPreset(providerId: ModelProviderId) {
  return MODEL_PROVIDER_PRESETS.find((preset) => preset.id === providerId) ?? MODEL_PROVIDER_PRESETS[0]
}
