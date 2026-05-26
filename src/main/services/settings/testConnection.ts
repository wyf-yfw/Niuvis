import type { ModelConnectionTestResult } from '../../../shared/types/settings.js'
import type { OpenAIApiMode } from '../../../shared/types/openai.js'
import { normalizeChatSettings } from '../../settingsStore.js'
import { createOpenAIClient, normalizeBaseUrl } from '../chat/openaiAdapter.js'

function resolveApiMode(raw: unknown): OpenAIApiMode {
  return raw === 'responses' ? 'responses' : 'chat'
}

export async function testModelConnection(
  profile: { apiKey: string; baseUrl: string; model: string; apiMode?: OpenAIApiMode },
  fetchImpl: typeof fetch = fetch,
): Promise<ModelConnectionTestResult> {
  const config = {
    ...normalizeChatSettings(profile),
    apiMode: resolveApiMode(profile.apiMode),
  }

  if (!config.model) {
    return { ok: false, message: '请先填写模型名称' }
  }

  if (!config.apiKey) {
    return { ok: false, message: '请先填写 API Key' }
  }

  const started = Date.now()

  try {
    const modelsResponse = await fetchImpl(`${normalizeBaseUrl(config.baseUrl)}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (modelsResponse.ok) {
      return {
        ok: true,
        message: `连接成功（/models 可用 · ${config.apiMode}）`,
        latencyMs: Date.now() - started,
      }
    }

    if (modelsResponse.status !== 404 && modelsResponse.status !== 405) {
      const body = await modelsResponse.text()

      return {
        ok: false,
        message: `模型列表请求失败：HTTP ${modelsResponse.status}${body ? ` — ${body.slice(0, 120)}` : ''}`,
      }
    }
  } catch {
    // 部分兼容服务没有 /models，继续走 SDK 探测
  }

  try {
    const client = createOpenAIClient(config)

    if (config.apiMode === 'responses') {
      await client.responses.create({
        model: config.model,
        input: 'ping',
        max_output_tokens: 8,
        temperature: 0,
      })
    } else {
      await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
        temperature: 0,
      })
    }

    return {
      ok: true,
      message: `连接成功（${config.apiMode === 'responses' ? 'Responses API' : 'Chat Completions'}）`,
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (/401|invalid api key|incorrect api key/i.test(message)) {
      return { ok: false, message: 'API Key 无效或未授权' }
    }

    if (/404|not found/i.test(message)) {
      return { ok: false, message: '模型不存在或 API 地址错误' }
    }

    if (/fetch failed|ECONNREFUSED|ENOTFOUND|Connection error/i.test(message)) {
      return { ok: false, message: `无法连接到 API 地址：${message}` }
    }

    if (/responses/i.test(message) && config.apiMode === 'responses') {
      return {
        ok: false,
        message: `当前端点可能不支持 Responses API，请改用 Chat Completions 模式。详情：${message.slice(0, 160)}`,
      }
    }

    return { ok: false, message: `连接失败：${message.slice(0, 200)}` }
  }
}
