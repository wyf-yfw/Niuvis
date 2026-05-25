import {
  Avatar,
  Button,
  Chip,
  ScrollShadow,
  Separator,
  Surface,
  Typography,
} from '@heroui/react'
import {
  Building2,
  FileText,
  Grid3X3,
  Images,
  ListTodo,
  MessageCircle,
  Monitor,
  Settings,
  Sparkles,
} from 'lucide-react'
import SettingsModal, { useSettingsModalState } from '../settings/SettingsModal'

type PageId = 'office' | 'chat' | 'tasks' | 'skills' | 'apps' | 'documents' | 'gallery' | 'computer'

interface SidebarProps {
  activePage: PageId
  onNavigate: (page: PageId) => void
}

const navItems = [
  { id: 'office' as PageId, label: '办公室', icon: Building2 },
  { id: 'chat' as PageId, label: '对话', icon: MessageCircle },
  { id: 'tasks' as PageId, label: '自动任务', icon: ListTodo },
  { id: 'skills' as PageId, label: '技能大全', icon: Sparkles },
]

const localKnowledgeItems = [
  { id: 'apps' as PageId, label: '应用', icon: Grid3X3 },
  { id: 'documents' as PageId, label: '文档', icon: FileText },
  { id: 'gallery' as PageId, label: '图库', icon: Images },
  { id: 'computer' as PageId, label: '此电脑', icon: Monitor },
]

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const settingsState = useSettingsModalState()

  return (
    <Surface
      className="flex h-screen w-[232px] shrink-0 flex-col border-r border-white/8 bg-[#141414] px-4 py-5 !text-white"
      variant="transparent"
    >
      <Surface className="mb-5 px-1" variant="transparent">
        <Typography className="!text-[17px] font-semibold tracking-tight !text-white" type="h5">
          Niuvis
        </Typography>
      </Surface>

      {/* <SearchField
        aria-label="搜索"
        className="mb-3 h-9 rounded-lg border border-white/8 bg-[#1c1c1c] text-xs !text-white/80 shadow-none"
        fullWidth
        variant="secondary"
      >
        <SearchField.Group className="h-full px-3">
          <SearchField.SearchIcon className="size-3.5 !text-white/50" />
          <SearchField.Input
            className="text-xs !text-white/85 placeholder:!text-white/45"
            placeholder="搜索"
          />
          <SearchField.ClearButton className="!text-white/55" />
        </SearchField.Group>
      </SearchField> */}

      <Surface className="space-y-1.5" variant="transparent">
        {navItems.map((item) => {
          const Icon = item.icon

          return (
            <Button
              key={item.id}
              className={`h-8 w-full justify-start rounded-lg px-3 text-left text-xs font-medium ${
                activePage === item.id
                  ? 'bg-white/[0.07] !text-white'
                  : '!text-white/82 hover:bg-white/[0.07] hover:!text-white'
              }`}
              variant="ghost"
              onClick={() => onNavigate(item.id)}
            >
              <Icon className="size-3.5 shrink-0 !text-white/70" strokeWidth={1.8} />
              {item.label}
            </Button>
          )
        })}
      </Surface>

      <ScrollShadow className="mt-6 min-h-0 flex-1" hideScrollBar>
        <Surface className="space-y-6 pr-1" variant="transparent">
          <Surface variant="transparent">
            <Typography className="mb-2 px-1 !text-[11px] font-medium !text-white/58" type="body-xs">
              本地知识库
            </Typography>
            <Surface className="space-y-1" variant="transparent">
              {localKnowledgeItems.map((item) => {
                const Icon = item.icon

                return (
                  <Button
                    key={item.id}
                    className={`h-8 w-full justify-start rounded-lg px-2.5 text-left text-xs font-medium ${
                      activePage === item.id
                        ? 'bg-white/[0.07] !text-white'
                        : '!text-white/78 hover:bg-white/[0.07] hover:!text-white'
                    }`}
                    variant="ghost"
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon className="size-3.5 w-4 shrink-0 !text-white/62" strokeWidth={1.8} />
                    <Typography className="min-w-0 flex-1 truncate !text-white/78" type="body-xs">
                      {item.label}
                    </Typography>
                  </Button>
                )
              })}
            </Surface>
          </Surface>
        </Surface>
      </ScrollShadow>

      <Separator className="mt-4 bg-white/8" />
      <Surface className="flex h-10 items-center gap-2 pt-4" variant="transparent">
        <Avatar className="size-5 shrink-0 bg-[#2a2a2a] text-[10px] text-white" size="sm">
          <Avatar.Fallback>N</Avatar.Fallback>
        </Avatar>
        <Button
          isIconOnly
          aria-label="设置"
          className="size-7 min-w-7 shrink-0 rounded-md !text-white/65 hover:bg-white/[0.08] hover:!text-white"
          variant="ghost"
          onPress={settingsState.open}
        >
          <Settings className="size-3.5" strokeWidth={1.8} />
        </Button>
        <Typography className="min-w-0 flex-1 truncate text-xs font-medium !text-white/82" type="body-xs">
          Niuvis
        </Typography>
        <Chip className="shrink-0 bg-white/[0.08] text-[10px] !text-white/70" size="sm" variant="soft">
          本地
        </Chip>
      </Surface>

      <SettingsModal state={settingsState} />
    </Surface>
  )
}
