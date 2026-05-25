import { Button, Card, Chip } from '@heroui/react'

interface Task {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'pending'
  agent: string
  time: string
}

const mockTasks: Task[] = [
  { id: '1', name: '每日微博签到', status: 'completed', agent: 'App Agent', time: '08:00' },
  { id: '2', name: '监控机票价格', status: 'running', agent: 'Search Agent', time: '进行中' },
  { id: '3', name: '整理下载文件夹', status: 'pending', agent: 'File Agent', time: '22:00' },
  { id: '4', name: '系统垃圾清理', status: 'failed', agent: 'Sys Agent', time: '失败' },
]

const statusColor: Record<string, 'success' | 'accent' | 'danger' | 'default'> = {
  completed: 'success',
  running: 'accent',
  failed: 'danger',
  pending: 'default',
}

const statusText: Record<string, string> = {
  completed: '已完成',
  running: '运行中',
  failed: '失败',
  pending: '等待中',
}

export default function TasksPage() {
  return (
    <div className="flex-1 h-screen bg-[#212121] p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">自动任务</h1>
          <Button className="bg-blue-600 text-white hover:bg-blue-700" variant="primary">
            + 新建任务
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {mockTasks.map((task) => (
            <Card key={task.id} className="bg-[#2a2a2a] border border-[#3a3a3a]">
              <Card.Content className="flex flex-row items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#3a3a3a] flex items-center justify-center text-white">
                    ⚡
                  </div>
                  <div>
                    <p className="text-white font-medium">{task.name}</p>
                    <p className="text-gray-400 text-sm">{task.agent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm">{task.time}</span>
                  <Chip color={statusColor[task.status]} variant="soft" size="sm">
                    {statusText[task.status]}
                  </Chip>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
