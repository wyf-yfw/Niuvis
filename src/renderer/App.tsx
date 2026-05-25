import { useCallback, useState } from 'react'
import NonElectronBanner from './components/NonElectronBanner'
import Sidebar from './components/sidebar/Sidebar'
import OfficePage from './pages/office/OfficePage'
import ChatPage from './pages/chat/ChatPage'
import TasksPage from './pages/tasks/TasksPage'
import SkillsPage from './pages/skills/SkillsPage'
import AppsPage from './pages/apps/AppsPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import GalleryPage from './pages/gallery/GalleryPage'
import ComputerPage from './pages/computer/ComputerPage'
import type { PageId, PageNavigationIntent } from './lib/pageNavigation'

export type { PageId }

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('office')
  const [navigationIntent, setNavigationIntent] = useState<PageNavigationIntent | null>(null)

  const navigate = useCallback((intent: PageNavigationIntent) => {
    setNavigationIntent(intent)
    setActivePage(intent.page)
  }, [])

  const clearNavigationIntent = useCallback(() => {
    setNavigationIntent(null)
  }, [])

  const renderPage = () => {
    switch (activePage) {
      case 'office':
        return <OfficePage />
      case 'chat':
        return <ChatPage />
      case 'tasks':
        return <TasksPage />
      case 'skills':
        return <SkillsPage />
      case 'apps':
        return (
          <AppsPage
            navigationIntent={navigationIntent?.page === 'apps' ? navigationIntent : undefined}
            onNavigationIntentConsumed={clearNavigationIntent}
          />
        )
      case 'documents':
        return (
          <DocumentsPage
            navigationIntent={navigationIntent?.page === 'documents' ? navigationIntent : undefined}
            onNavigationIntentConsumed={clearNavigationIntent}
          />
        )
      case 'gallery':
        return (
          <GalleryPage
            navigationIntent={navigationIntent?.page === 'gallery' ? navigationIntent : undefined}
            onNavigationIntentConsumed={clearNavigationIntent}
          />
        )
      case 'computer':
        return <ComputerPage onNavigate={navigate} />
      default:
        return <OfficePage />
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <NonElectronBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        {renderPage()}
      </div>
    </div>
  )
}
