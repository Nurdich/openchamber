## 2026-03-21

- **SSH Windows 直接调用 ssh.exe**（`packages/desktop/src-tauri/src/remote_ssh.rs`）：
  - 移除 ControlMaster 依赖，Windows 上直接调用系统 `ssh.exe`。
  - `build_ssh_command()`：Windows 上使用 `ssh.exe`，Unix 上使用 `ssh`。
  - `spawn_master_process()`：Windows 分支不使用 ControlMaster，直接 `ssh -N` 保持连接。
  - `run_remote_command()`：Windows 分支跳过 ControlPath，直接 `ssh user@host "command"` 执行。
  - `spawn_main_forward()`：Windows 分支使用 `ssh.exe -N -L` 端口转发（无 ControlMaster）。
  - `is_control_master_alive()` / `stop_control_master_best_effort()`：Windows 分支提供空实现（无 ControlMaster）。
  - `DEFAULT_CONTROL_PERSIST_SEC`、`control_master_operation()`：标记 `#[cfg(not(windows))]`，仅 Unix 使用。
  - 验证：`cargo check` 通过，无错误或警告。

- **SSH Windows 适配**（`packages/desktop/src-tauri/src/remote_ssh.rs`）：
  - `settings_file_path()`：增加 Windows 支持，使用 `APPDATA`（主路径）和 `USERPROFILE`（备用）作为配置存储位置，保留非 Windows 平台的 Unix 行为。
  - `ensure_session_dir()`：将硬编码 `/tmp` 回退改为 `std::env::temp_dir()`，跨平台兼容。
  - `desktop_ssh_import_hosts()`：增加 Windows SSH config 路径支持（`USERPROFILE\.ssh\config`），非 Windows 平台保留原有 `HOME` 和 `/etc/ssh/ssh_config` 逻辑。
  - `askpass_script_content()`：Windows 下返回空字符串（osascript 为 macOS 专有）。
  - `spawn_master_process()`：Windows 分支跳过 `SSH_ASKPASS_REQUIRE`、`SSH_ASKPASS`、`DISPLAY` 等 Unix 专有环境变量。
- 收敛了 stash pop 之后遗留的 UI 合并冲突，当前工作区已无未解决的 `git` 冲突文件。
- 为 `packages/desktop/src-tauri/src/main.rs` 补齐 Windows 适配：
  - `settings_file_path()` 使用 `APPDATA` / `USERPROFILE` 作为 Windows 配置路径来源。
  - `desktop_open_path()` 支持通过 `explorer` 打开路径。
  - `desktop_open_in_app()` 支持 Windows 编辑器 CLI 与 JetBrains Toolbox 脚本解析。
  - `desktop_filter_installed_apps()` / `desktop_get_installed_apps()` / `desktop_fetch_app_icons()` 增加 Windows 分支。
  - `desktop_clear_cache()` 增加 Windows 分支。
  - 新增 Windows 原生菜单构建与菜单事件分发。
- 验证：`cargo check`（`packages/desktop/src-tauri`）通过。
- 修复了 `packages/ui/src/components/sections/providers/ProvidersPage.tsx` 中陈旧的 `@/components/ui/button-small` 引用：
  - 将缺失组件导入替换为现有标准 `@/components/ui/button`。
  - 将页面中的 `ButtonSmall` 用法统一替换为 `Button`，保留现有 `size="xs"` / `variant` / `className` 语义。
- 验证：`bun run --filter @openchamber/ui build` 通过；仓库根目录 `bun run build` 通过。
- 复核桌面构建链：
  - `bun run --cwd packages/desktop build:sidecar` 通过。
  - `bun run desktop:build` 重新执行后通过到 `tauri build` 阶段，未再出现 `packages/desktop/scripts/build-sidecar.mjs` 第 67 行抛出的 `Command failed: bun run build`。
  - 当前仅剩构建警告（如 Vite chunk / dynamic import 提示），不再是阻塞性错误。

- **端口随机化修复**（`packages/web/server/index.js`）：
  - 问题：端口 3000 被占用时，服务器直接报错退出，Desktop 端需等待 8 秒健康检查超时才能尝试下一个端口，体感像"卡死"。
  - 修复：在服务器启动逻辑中增加 `EADDRINUSE` 自动重试机制。
  - 实现：当请求端口被占用时，自动关闭服务器并选择一个新随机端口（49152-65535 动态范围）重试，最多重试 10 次。
  - 重试成功后，通过 `process.send?.({ type: 'openchamber:ready', port: activePort })` 通知 Desktop 端实际使用的端口。
  - 验证：`bun run type-check` 通过，`bun run build` 通过。

- **Desktop Rust 构建修复**（`packages/desktop/src-tauri/src/main.rs`）：
  - 修复 `desktop_new_window_at_url()` 对 `create_window()` 的旧签名调用，补上传入的 `secret` 参数。
  - 修复两处 `state.secret.lock().ok()` 后错误调用 `flatten()` 的问题，改为从 `MutexGuard<Option<String>>` 中克隆内部 `Option<String>`。
  - 目标：消除 `cargo build --release` 中的 `E0061` 与两处 `E0599`。
