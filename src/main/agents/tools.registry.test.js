import test from 'node:test'
import assert from 'node:assert/strict'
import { searchFilesTool } from '../../../dist/main/agents/tools/search-files.js'
import { deleteFileTool } from '../../../dist/main/agents/tools/delete-file.js'
import { listToolDefinitions, validateToolInput } from '../../../dist/main/agents/tools/index.js'

test('listToolDefinitions exposes all P3 tools with schemas', () => {
  const definitions = listToolDefinitions()
  const names = definitions.map((item) => item.name).sort()

  assert.deepEqual(names, [
    'copy_file',
    'create_file',
    'delete_file',
    'get_file_meta',
    'get_system_info',
    'launch_app',
    'list_directory',
    'move_file',
    'open_path',
    'read_file',
    'rename_file',
    'search_files',
    'web_search',
  ])

  for (const definition of definitions) {
    assert.ok(definition.inputSchema)
    assert.ok(['low', 'medium', 'high'].includes(definition.riskLevel))
  }
})

test('validateToolInput rejects invalid payloads', () => {
  assert.throws(() => validateToolInput(searchFilesTool, {}), /工具参数无效/)
  assert.throws(() => validateToolInput(searchFilesTool, { query: '' }), /工具参数无效/)

  const parsed = validateToolInput(searchFilesTool, { query: 'markdown' })
  assert.equal(parsed.query, 'markdown')
})

test('search_files preview and execute return summary shape', async () => {
  const preview = searchFilesTool.preview({ query: 'hello' })
  assert.match(preview.summary, /搜索/)

  // 执行依赖 SQLite，在 Electron 构建的 better-sqlite3 下由 schema 测试覆盖
  assert.equal(typeof searchFilesTool.execute, 'function')
})

test('delete_file is high risk and requires confirmation on tool definition', () => {
  assert.equal(deleteFileTool.riskLevel, 'high')
  assert.equal(deleteFileTool.requiresConfirmation, true)

  const preview = deleteFileTool.preview({ path: 'C:\\temp\\demo.txt' })
  assert.match(preview.summary, /回收站/)
})
