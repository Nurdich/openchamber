import React from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGitStore, useGitBranches } from '@/stores/useGitStore';
import { useRuntimeAPIs } from '@/hooks/useRuntimeAPIs';
import { getRootBranch } from '@/lib/worktrees/worktreeStatus';

/** localStorage key matching NewWorktreeDialog */
const LAST_SOURCE_BRANCH_KEY = 'oc:lastWorktreeSourceBranch';

export type WorktreeBaseOption = {
  value: string;
  label: string;
  group: 'special' | 'local' | 'remote';
};

export interface BranchSelectorProps {
  /** Current directory to check for git repository */
  directory: string | null;
  /** Currently selected branch */
  value: string;
  /** Called when branch selection changes */
  onChange: (branch: string) => void;
  /** Optional className for the trigger */
  className?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** ID for accessibility */
  id?: string;
}

export interface BranchSelectorState {
  localBranches: string[];
  remoteBranches: string[];
  isLoading: boolean;
  isGitRepository: boolean | null;
}

/**
 * Hook to load available git branches for a directory.
 * Uses the shared useGitStore (same as NewWorktreeDialog).
 */
// eslint-disable-next-line react-refresh/only-export-components -- Hook is tightly coupled with BranchSelector
export function useBranchOptions(directory: string | null): BranchSelectorState {
  const [branches, setBranches] = React.useState<WorktreeBaseOption[]>([
    { value: 'HEAD', label: '当前（HEAD）', group: 'special' },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGitRepository, setIsGitRepository] = React.useState<boolean | null>(null);

  // Fetch branches if not cached
  React.useEffect(() => {
    if (!directory || !git) return;
    if (branches?.all) return; // Already cached
    void fetchBranches(directory, git);
  }, [directory, git, branches?.all, fetchBranches]);

    if (!directory) {
      setIsGitRepository(null);
      setIsLoading(false);
      setBranches([{ value: 'HEAD', label: '当前（HEAD）', group: 'special' }]);
      return;
    }

  const remoteBranches = React.useMemo(() => {
    if (!branches?.all) return [];
    return branches.all
      .filter((branchName: string) => branchName.startsWith('remotes/'))
      .map((branchName: string) => branchName.replace(/^remotes\//, ''))
      .sort();
  }, [branches]);

  // isGitRepository: true if we got branches, false if fetch returned empty, null if not yet loaded
  const isGitRepository = React.useMemo<boolean | null>(() => {
    if (!directory) return null;
    if (isLoading) return null;
    if (!branches) return null;
    return Boolean(branches.all);
  }, [directory, isLoading, branches]);

        setIsGitRepository(isGit);

        if (!isGit) {
          setBranches([{ value: 'HEAD', label: '当前（HEAD）', group: 'special' }]);
          return;
        }

        const branchData = await getGitBranches(directory).catch(() => null);
        if (cancelled) return;

        const rootTrackingRemote = await resolveRootTrackingRemote(directory).catch(() => null);
        if (cancelled) return;

        const worktreeBaseOptions: WorktreeBaseOption[] = [];
        const headLabel = branchData?.current ? `当前（HEAD: ${branchData.current}）` : '当前（HEAD）';
        worktreeBaseOptions.push({ value: 'HEAD', label: headLabel, group: 'special' });

        if (branchData) {
          const localBranches = branchData.all
            .filter((branchName) => !branchName.startsWith('remotes/'))
            .filter((branchName) => {
              if (!rootTrackingRemote) {
                return true;
              }
              const tracking = branchData.branches?.[branchName]?.tracking;
              const trackingRemote = parseTrackingRemote(tracking);
              if (!trackingRemote) {
                return true;
              }
              return trackingRemote === rootTrackingRemote;
            })
            .sort((a, b) => a.localeCompare(b));
          localBranches.forEach((branchName) => {
            worktreeBaseOptions.push({ value: branchName, label: branchName, group: 'local' });
          });

          const remoteBranches = branchData.all
            .filter((branchName) => branchName.startsWith('remotes/'))
            .map((branchName) => branchName.replace(/^remotes\//, ''))
            .filter((branchName) => {
              if (!rootTrackingRemote) {
                return true;
              }
              const slashIndex = branchName.indexOf('/');
              if (slashIndex <= 0) {
                return false;
              }
              return branchName.slice(0, slashIndex) === rootTrackingRemote;
            })
            .sort((a, b) => a.localeCompare(b));
          remoteBranches.forEach((branchName) => {
            worktreeBaseOptions.push({ value: branchName, label: branchName, group: 'remote' });
          });
        }

        setBranches(worktreeBaseOptions);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [directory]);

  return { branches, isLoading, isGitRepository };
}

/**
 * Branch selector dropdown for selecting a source branch for worktree creation.
 * Matches the NewWorktreeDialog source branch selector exactly.
 */
export const BranchSelector: React.FC<BranchSelectorProps> = ({
  directory,
  value,
  onChange,
  className,
  disabled,
  id,
}) => {
  const { localBranches, remoteBranches, isLoading, isGitRepository } = useBranchOptions(directory);
  const allBranches = React.useMemo(
    () => [...localBranches, ...remoteBranches.map(b => `remotes/${b}`)],
    [localBranches, remoteBranches],
  );

  // Resolve default source branch (same priority as NewWorktreeDialog)
  React.useEffect(() => {
    if (disabled || isLoading || allBranches.length === 0) return;
    // If current value is valid, keep it
    if (value && allBranches.includes(value)) return;

    const resolve = async () => {
      try {
        const rootBranch = directory ? await getRootBranch(directory).catch(() => null) : null;
        const saved = localStorage.getItem(LAST_SOURCE_BRANCH_KEY);

        if (saved && allBranches.includes(saved)) {
          onChange(saved);
        } else if (rootBranch && allBranches.includes(rootBranch)) {
          onChange(rootBranch);
        } else if (allBranches.includes('main')) {
          onChange('main');
        } else if (allBranches.includes('master')) {
          onChange('master');
        } else if (allBranches[0]) {
          onChange(allBranches[0]);
        }
      } catch {
        // ignore
      }
    };

    void resolve();
  }, [allBranches, directory, disabled, isLoading, onChange, value]);

  const isDisabled = disabled || !isGitRepository || isLoading;

  return (
    <div>
      <Select
        value={value}
        onValueChange={onChange}
        disabled={isDisabled}
      >
        <SelectTrigger
          id={id}
          size="lg"
          className={className ?? 'w-fit typography-meta text-foreground'}
        >
          {selectedLabel ? (
            <SelectValue>{selectedLabel}</SelectValue>
          ) : (
            <SelectValue placeholder={isLoading ? '加载分支中…' : '选择分支'} />
          )}
        </SelectTrigger>
        <SelectContent fitContent>
          <SelectGroup>
            <SelectLabel>默认</SelectLabel>
            {branches
              .filter((option) => option.group === 'special')
              .map((option) => (
                <SelectItem key={option.value} value={option.value} className="w-auto whitespace-nowrap">
                  {option.label}
                </SelectItem>
              ))}
          </SelectGroup>

          {branches.some((option) => option.group === 'local') ? (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>本地分支</SelectLabel>
                {branches
                  .filter((option) => option.group === 'local')
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value} className="w-auto whitespace-nowrap">
                      {option.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
            </>
          ) : null}

          {branches.some((option) => option.group === 'remote') ? (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>远程分支</SelectLabel>
                {branches
                  .filter((option) => option.group === 'remote')
                  .map((option) => (
                    <SelectItem key={option.value} value={option.value} className="w-auto whitespace-nowrap">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </>
          )}
        </SelectContent>
      </Select>

      {isGitRepository === false && (
        <p className="typography-micro text-muted-foreground/70">当前目录不是 Git 仓库。</p>
      )}
    </div>
  );
};
