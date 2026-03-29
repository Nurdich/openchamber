import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { RiFolderLine, RiInformationLine } from '@remixicon/react';
import { isDesktopShell, isTauriShell } from '@/lib/desktop';
import { updateDesktopSettings } from '@/lib/persistence';
import { reloadOpenCodeConfiguration } from '@/stores/useAgentsStore';

export const OpenCodeCliSettings: React.FC = () => {
  const [value, setValue] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/config/settings', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          return;
        }
        const data = (await response.json().catch(() => null)) as null | { opencodeBinary?: unknown };
        if (cancelled || !data) {
          return;
        }
        const next = typeof data.opencodeBinary === 'string' ? data.opencodeBinary.trim() : '';
        setValue(next);
      } catch {
        // ignore
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBrowse = React.useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isDesktopShell() || !isTauriShell()) {
      return;
    }

    const tauri = (window as unknown as { __TAURI__?: { dialog?: { open?: (opts: Record<string, unknown>) => Promise<unknown> } } }).__TAURI__;
    if (!tauri?.dialog?.open) {
      return;
    }

    try {
      const selected = await tauri.dialog.open({
        title: '选择 opencode 可执行文件',
        multiple: false,
        directory: false,
      });
      if (typeof selected === 'string' && selected.trim().length > 0) {
        setValue(selected.trim());
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSaveAndReload = React.useCallback(async () => {
    setIsSaving(true);
    try {
      await updateDesktopSettings({ opencodeBinary: value.trim() });
      await reloadOpenCodeConfiguration({ message: '正在重启 OpenCode...', mode: 'projects', scopes: ['all'] });
    } finally {
      setIsSaving(false);
    }
  }, [value]);

  return (
    <div className="mb-8">
      <div className="mb-1 px-1">
        <div className="flex items-center gap-2">
          <h3 className="typography-ui-header font-medium text-foreground">
            OpenCode CLI
          </h3>
          <Tooltip delayDuration={1000}>
            <TooltipTrigger asChild>
              <RiInformationLine className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent sideOffset={8} className="max-w-xs">
              可选的 <code className="font-mono text-xs">opencode</code> 可执行文件的绝对路径。
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <section className="px-2 pb-2 pt-0 space-y-0.5">
        <div className="flex flex-col gap-2 py-1.5 sm:flex-row sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-col shrink-0">
            <span className="typography-ui-label text-foreground">OpenCode 可执行文件路径</span>
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:w-[20rem]">
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="/Users/you/.bun/bin/opencode"
              disabled={isLoading || isSaving}
              className="h-7 min-w-0 flex-1 font-mono text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={handleBrowse}
              disabled={isLoading || isSaving || !isDesktopShell() || !isTauriShell()}
              className="h-7 w-7 p-0"
              aria-label="浏览 OpenCode 可执行文件路径"
              title="浏览"
            >
              <RiFolderLine className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="py-1.5">
          <div className="typography-micro text-muted-foreground/70">
            提示：您也可以使用 <span className="font-mono">OPENCODE_BINARY</span> 环境变量，但此设置会保存在 <span className="font-mono">~/.config/openchamber/settings.json</span> 中。
          </div>
        </div>

        <div className="flex justify-start py-1.5">
          <Button
            type="button"
            size="xs"
            onClick={handleSaveAndReload}
            disabled={isLoading || isSaving}
            className="shrink-0 !font-normal"
          >
            {isSaving ? '保存中...' : '保存并重载'}
          </Button>
        </div>
      </section>
    </div>
  );
};
