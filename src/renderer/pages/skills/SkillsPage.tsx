import { Button, Card, Chip } from '@heroui/react'

interface Skill {
  id: string
  name: string
  description: string
  agent: string
  enabled: boolean
}

const mockSkills: Skill[] = [
  { id: '1', name: '文件搜索', description: '基于语义的本地文件搜索', agent: 'File Agent', enabled: true },
  { id: '2', name: '系统优化', description: '清理垃圾、优化启动项', agent: 'Sys Agent', enabled: true },
  { id: '3', name: '网页抓取', description: '自动抓取网页数据', agent: 'Web Agent', enabled: true },
  { id: '4', name: '应用自动化', description: '自动操作本地应用', agent: 'App Agent', enabled: false },
  { id: '5', name: '文档总结', description: '智能总结文档内容', agent: 'File Agent', enabled: true },
  { id: '6', name: '硬件检测', description: '检测电脑硬件信息', agent: 'Sys Agent', enabled: true },
]

export default function SkillsPage() {
  return (
    <div className="flex-1 h-screen bg-[#212121] p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">技能大全</h1>
          <Button variant="outline" className="border-[#3a3a3a] text-white">
            刷新
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {mockSkills.map((skill) => (
            <Card key={skill.id} className="bg-[#2a2a2a] border border-[#3a3a3a]">
              <Card.Content className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-[#3a3a3a] flex items-center justify-center text-white">
                    ⚡
                  </div>
                  <Chip
                    color={skill.enabled ? 'success' : 'default'}
                    variant="soft"
                    size="sm"
                  >
                    {skill.enabled ? '已启用' : '未启用'}
                  </Chip>
                </div>
                <h3 className="text-white font-semibold mb-1">{skill.name}</h3>
                <p className="text-gray-400 text-sm mb-3">{skill.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">{skill.agent}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {skill.enabled ? '配置' : '启用'}
                  </Button>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
