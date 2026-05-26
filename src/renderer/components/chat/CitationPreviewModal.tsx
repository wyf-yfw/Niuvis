import { Modal, ScrollShadow, Typography } from '@heroui/react'
import type { ChatCitation } from '../../../shared/types/chat'
import type { FilePreviewResult } from '../../../shared/types/agent'

interface CitationPreviewModalProps {
  citation: ChatCitation | null
  preview: FilePreviewResult | null
  isOpen: boolean
  onClose: () => void
}

export default function CitationPreviewModal({
  citation,
  preview,
  isOpen,
  onClose,
}: CitationPreviewModalProps) {
  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop className="bg-black/60" />
      <Modal.Container className="max-w-2xl">
        <Modal.Dialog className="border border-white/10 bg-[#2a2a2a] text-white">
          <Modal.Header className="border-b border-white/10">
            <Modal.Heading className="text-white">
              引用 [{citation?.index}] {citation?.label ?? citation?.path}
            </Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <Typography className="mb-3 break-all !text-white/50" type="body-sm">
              {citation?.path}
            </Typography>
            <ScrollShadow className="max-h-[50vh] rounded-lg border border-white/10 bg-black/30 p-3">
              <Typography className="whitespace-pre-wrap font-mono text-xs leading-5 !text-white/80" type="body-sm">
                {preview?.isDirectory
                  ? '这是一个目录。'
                  : preview?.content || '无法预览此文件内容。'}
              </Typography>
            </ScrollShadow>
          </Modal.Body>
        </Modal.Dialog>
      </Modal.Container>
    </Modal>
  )
}
