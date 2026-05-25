import type { ModelConnectionTestResult } from '../../../shared/types/settings.js'
import { normalizeChatSettings } from '../../settingsStore.js'

function getModelsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/models`
}

function getChatCompletionsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

export async function testModelConnection(
  profile: { apiKey: string; baseUrl: string; model: string },
  fetchImpl: typeof fetch = fetch,
): Promise<ModelConnectionTestResult> {
  const config = normalizeChatSettings(profile)

  if (!config.model) {
    return { ok: false, message: '请先填写模型名称' }
  }

  const started = Date.now()

  try {
    const modelsResponse = await fetchImpl(getModelsUrl(config.baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
    })

    if (modelsResponse.ok) {
      return {
        ok: true,
        message: '连接成功（/models 可用）',
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
    // 部分本地服务没有 /models，继续走最小对话探测
  }

  try {
    const response = await fetchImpl(getChatCompletionsUrl(config.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 5,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      const body = await response.text()

      if (response.status === 401) {
        return { ok: false, message: 'API Key 无效或未授权（HTTP 401）' }
      }

      if (response.status === 404) {
        return { ok: false, message: '模型不存在或 API 地址错误（HTTP 404）' }
      }

      return {
        ok: false,
        message: `连接失败：HTTP ${response.status}${body ? ` — ${body.slice(0, 160)}` : ''}`,
      }
    }

    return {
      ok: true,
      message: '连接成功（最小对话请求通过）',
      latencyMs: Date.now() - started,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (/fetch failed|ECONNREFUSED|ENOTFOUND/i.test(message)) {
      return { ok: false, message: `无法连接到 API 地址，请检查网络或服务是否启动：${message}` }
    }

    return { ok: false, message: `连接失败：${message}` }
  }
}
