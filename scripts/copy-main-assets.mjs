import fs from 'node:fs'
import path from 'node:path'

const pairs = [
  ['src/main/services/database/migrations', 'dist/main/services/database/migrations'],
  ['src/shared/constants/channels.json', 'dist/shared/constants/channels.json'],
]

for (const [from, to] of pairs) {
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.cpSync(from, to, { recursive: true })
}
