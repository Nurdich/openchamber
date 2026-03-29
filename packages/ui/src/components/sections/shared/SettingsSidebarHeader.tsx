import React from 'react';
import { Button } from '@/components/ui/button';
import { RiAddLine } from '@remixicon/react';
import { useDeviceInfo } from '@/lib/device';
import { cn } from '@/lib/utils';

interface SettingsSidebarHeaderProps {
  /** 自定义标签前缀（默认："总计"） */
  label?: string;
  /** 正文显示的总数 */
  count?: number;
  /** 添加按鈕的 aria label */
  addButtonLabel?: string;
  /** 点击添加按鈕的回调 */
  onAdd?: () => void;
}

/**
 * 左侧显示"总计 X"，右侧可选显示添加按钮。
 *
 * @example
 * <SettingsSidebarHeader
 *   count={agents.length}
 *   onAdd={() => setCreateDialogOpen(true)}
 *   addButtonLabel="创建新项目"
 * />
 */
export const SettingsSidebarHeader: React.FC<SettingsSidebarHeaderProps> = ({
  count,
  onAdd,
  label = '总计',
  addButtonLabel = '添加新项目',
}) => {
  const { isMobile } = useDeviceInfo();

  return (
    <div
      className={cn(
        'border-b px-3',
        isMobile ? 'mt-2 py-3' : 'py-3'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="typography-meta text-muted-foreground">
          {label} {count}
        </span>
        {onAdd && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 -my-1 text-muted-foreground"
            onClick={onAdd}
            aria-label={addButtonLabel}
          >
            <RiAddLine className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
