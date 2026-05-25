import { useState } from 'react'
import Sidebar from './components/sidebar/Sidebar'
import OfficePage from './pages/office/OfficePage'
import ChatPage from './pages/chat/ChatPage'
import TasksPage from './pages/tasks/TasksPage'
import SkillsPage from './pages/skills/SkillsPage'
import AppsPage from './pages/apps/AppsPage'
import DocumentsPage from './pages/documents/DocumentsPage'
import GalleryPage from './pages/gallery/GalleryPage'
import ComputerPage from './pages/computer/ComputerPage'

export type PageId = 'office' | 'chat' | 'tasks' | 'skills' | 'apps' | 'documents' | 'gallery' | 'computer'

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('office')

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
        return <AppsPage />
      case 'documents':
        return <DocumentsPage />
      case 'gallery':
        return <GalleryPage />
      case 'computer':
        return <ComputerPage />
      default:
        return <OfficePage />
    }
  }

  return (
    <div className="flex h-screen">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {renderPage()}
    </div>
  )
}
