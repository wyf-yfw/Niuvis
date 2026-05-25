/** P1+ Agent 相关类型占位，便于主进程与渲染进程共用 */
export type AgentRunStatus = 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled'

export type ToolRiskLevel = 'low' | 'medium' | 'high'
