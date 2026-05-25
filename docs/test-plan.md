# Niuvis 手动测试清单（P0–P2）

> 自动化：`npm test`（含 10 万行搜索 P95、中文 LIKE、索引目录、文档 snippet 等）。

## 启动

```bash
cd /home/lanchong/Niuvis
npm run dev
```

必须使用 Electron 窗口，不要只打开浏览器访问 Vite。

## P2 电脑知识

### 索引

- [ ] 启动约 8 秒后索引 Chip 显示条数，或手动点击 Chip 触发扫描
- [ ] `sqlite3 ~/.config/niuvis/niuvis.db "SELECT kind, COUNT(*) FROM computer_index_items GROUP BY kind;"` 有数据
- [ ] 重复扫描后条数不无限暴涨

### 此电脑

- [ ] 仅显示索引根目录及已索引子项，未索引磁盘路径不出现
- [ ] 搜索 ≥3 字出现分组结果
- [ ] **回车** 跳转到应用/文档/图库对应页并带上搜索词

### 文档 / 图库

- [ ] 「本地上传」与「电脑索引」可来回切换
- [ ] 索引视图「加载更多」分页正常

### 应用

- [ ] 有索引时列表标注「来自本地索引」；无索引时 fallback 系统扫描

### F2.4 验收搜索词

- [ ] `markdown` 或 `.md`
- [ ] `pdf` 或桌面路径片段
- [ ] `vscode` 或 `code`

### 实时监听（可选）

- [ ] 设置中开启「实时文件监听」后，在索引目录新建文件约 1s 内 Chip 条数变化（浅层目录）
