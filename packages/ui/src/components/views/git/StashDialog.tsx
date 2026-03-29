import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui';
import { RiAlertLine, RiLoader4Line } from '@remixicon/react';

interface StashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: 'merge' | 'rebase';
  targetBranch: string;
  onConfirm: (restoreAfter: boolean) => Promise<void>;
}

export const StashDialog: React.FC<StashDialogProps> = ({
  open,
  onOpenChange,
  operation,
  targetBranch,
  onConfirm,
}) => {
  const [restoreAfter, setRestoreAfter] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const operationLabel = operation === 'merge' ? 'Merge' : 'Rebase';

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(restoreAfter);
      onOpenChange(false);
    } catch (err) {
      // Show error to user - parent may also handle it but user should see feedback
      const message = err instanceof Error ? err.message : `Failed to ${operation}`;
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (!isProcessing) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <RiAlertLine className="size-5 text-[var(--status-warning)]" />
            <DialogTitle>待提交的更改</DialogTitle>
          </div>
          <DialogDescription>
            您有待提交的更改，将被此操作覆盖。
            是否要临时保存它们？
            Would you like to stash them temporarily?
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <p className="typography-meta text-muted-foreground mb-3">
            这将执行以下操作：
          </p>
          <ol className="list-decimal list-inside space-y-1 typography-meta text-foreground">
            <li>保存您的未提交更改</li>
            <li>
              {operation === 'merge' ? '合并' : '变基'}{' '}
              {operation === 'merge' ? '到' : '到'}{' '}
              <span className="font-mono text-primary">{targetBranch}</span>
            </li>
            {restoreAfter && <li>恢复您保存的更改</li>}
            <li>
              {operation === 'merge' ? 'Merge' : 'Rebase'}{' '}
              {operation === 'merge' ? 'with' : 'onto'}{' '}
              <span className="font-mono text-primary">{targetBranch}</span>
            </li>
            {restoreAfter && <li>Restore your stashed changes</li>}
          </ol>
        </div>

        <div className="flex items-center gap-2 py-2">
          <Checkbox
            checked={restoreAfter}
            onChange={setRestoreAfter}
            disabled={isProcessing}
            ariaLabel="操作完成后恢复更改"
          />
          <span
            className="typography-ui-label text-foreground cursor-pointer select-none"
            onClick={() => !isProcessing && setRestoreAfter(!restoreAfter)}
          >
            操作完成后恢复更改
          </span>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            disabled={isProcessing}
          >
            取消
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleConfirm}
            disabled={isProcessing}
            className="gap-1.5"
          >
            {isProcessing ? (
              <>
                <RiLoader4Line className="size-4 animate-spin" />
                <RiLoader4Line className="size-4 animate-spin" />
                处理中...
              </>
            ) : (
              `保存并${operationLabel}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
