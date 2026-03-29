import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGitIdentitiesStore, type GitIdentityProfile, type GitIdentityAuthType } from '@/stores/useGitIdentitiesStore';
import {
  RiDeleteBinLine,
  RiGitBranchLine,
  RiBriefcaseLine,
  RiHomeLine,
  RiGraduationCapLine,
  RiCodeLine,
  RiInformationLine,
  RiKeyLine,
  RiLock2Line,
} from '@remixicon/react';
import { cn } from '@/lib/utils';

const PROFILE_COLORS = [
  { key: 'keyword', label: 'Green', cssVar: 'var(--syntax-keyword)' },
  { key: 'error', label: 'Red', cssVar: 'var(--status-error)' },
  { key: 'string', label: 'Cyan', cssVar: 'var(--syntax-string)' },
  { key: 'function', label: 'Orange', cssVar: 'var(--syntax-function)' },
  { key: 'type', label: 'Yellow', cssVar: 'var(--syntax-type)' },
];

const PROFILE_ICONS = [
  { key: 'branch', Icon: RiGitBranchLine, label: 'Branch' },
  { key: 'briefcase', Icon: RiBriefcaseLine, label: 'Work' },
  { key: 'house', Icon: RiHomeLine, label: 'Personal' },
  { key: 'graduation', Icon: RiGraduationCapLine, label: 'School' },
  { key: 'code', Icon: RiCodeLine, label: 'Code' },
];

interface GitIdentityEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Profile ID to edit, 'new' for creation, or null */
  profileId: string | null;
  /** Pre-fill data for importing a discovered credential */
  importData?: { host: string; username: string } | null;
}

export const GitIdentityEditorDialog: React.FC<GitIdentityEditorDialogProps> = ({
  open,
  onOpenChange,
  profileId,
  importData,
}) => {
  const {
    getProfileById,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useGitIdentitiesStore();

  const selectedProfile = React.useMemo(() =>
    profileId && profileId !== 'new' && !importData ? getProfileById(profileId) : null,
    [profileId, getProfileById, importData]
  );
  const isNewProfile = profileId === 'new' || importData != null;
  const isGlobalProfile = profileId === 'global';

  const [name, setName] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const [userEmail, setUserEmail] = React.useState('');
  const [authType, setAuthType] = React.useState<GitIdentityAuthType>('ssh');
  const [sshKey, setSshKey] = React.useState('');
  const [host, setHost] = React.useState('');
  const [color, setColor] = React.useState('keyword');
  const [icon, setIcon] = React.useState('branch');
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (importData) {
      const parts = importData.host.split('/');
      const displayName = parts.length >= 3 ? parts[parts.length - 1] : importData.host;
      setName(displayName);
      setUserName(importData.username);
      setUserEmail('');
      setAuthType('token');
      setSshKey('');
      setHost(importData.host);
      setColor('string');
      setIcon('code');
    } else if (isNewProfile) {
      setName('');
      setUserName('');
      setUserEmail('');
      setAuthType('ssh');
      setSshKey('');
      setHost('');
      setColor('keyword');
      setIcon('branch');
    } else if (selectedProfile) {
      setName(selectedProfile.name);
      setUserName(selectedProfile.userName);
      setUserEmail(selectedProfile.userEmail);
      setAuthType(selectedProfile.authType || 'ssh');
      setSshKey(selectedProfile.sshKey || '');
      setHost(selectedProfile.host || '');
      setColor(selectedProfile.color || 'keyword');
      setIcon(selectedProfile.icon || 'branch');
    } else if (isGlobalProfile) {
      const global = getProfileById('global');
      if (global) {
        setName(global.name);
        setUserName(global.userName);
        setUserEmail(global.userEmail);
        setAuthType(global.authType || 'ssh');
        setSshKey(global.sshKey || '');
        setHost(global.host || '');
        setColor(global.color || 'keyword');
        setIcon(global.icon || 'branch');
      }
    }
  }, [open, profileId, selectedProfile, isNewProfile, importData, isGlobalProfile, getProfileById]);

  const handleSave = async () => {
    if (!userName.trim() || !userEmail.trim()) {
      toast.error('用户名和邮箱为必填项');
      return;
    }
    if (authType === 'token' && !host.trim()) {
      toast.error('基于令牌的认证需要填写主机地址');
      return;
    }

    setIsSaving(true);
    try {
      const profileData: Omit<GitIdentityProfile, 'id'> & { id?: string } = {
        name: name.trim() || userName.trim(),
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        authType,
        sshKey: authType === 'ssh' ? (sshKey.trim() || null) : null,
        host: authType === 'token' ? (host.trim() || null) : null,
        color,
        icon,
      };

      let success: boolean;
      if (isNewProfile) {
        success = await createProfile(profileData);
      } else if (profileId) {
        success = await updateProfile(profileId, profileData);
      } else {
        return;
      }

      if (success) {
        toast.success(isNewProfile ? '配置已创建' : '配置已更新');
        onOpenChange(false);
      } else {
        toast.error(isNewProfile ? '创建配置失败' : '更新配置失败');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('保存时发生错误');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!profileId || isNewProfile) return;
    setIsDeleting(true);
    try {
      const success = await deleteProfile(profileId);
      if (success) {
        toast.success('配置已删除');
        setIsDeleteDialogOpen(false);
        onOpenChange(false);
      } else {
        toast.error('删除配置失败');
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('删除时发生错误');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentColorValue = React.useMemo(() => {
    const colorConfig = PROFILE_COLORS.find(c => c.key === color);
    return colorConfig?.cssVar || 'var(--syntax-keyword)';
  }, [color]);

  const title = importData
    ? '导入凭据'
    : isNewProfile
    ? '新建身份'
    : isGlobalProfile
    ? '全局身份'
    : (selectedProfile?.name || '编辑身份');

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {isGlobalProfile
                ? '系统全局 Git 身份（只读）'
                : isNewProfile
                ? '创建新的 Git 身份配置'
                : '编辑身份配置设置'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Profile Display */}
            {!isGlobalProfile && (
              <div className="space-y-3">
                <div>
                  <label className="typography-ui-label text-foreground block mb-1.5">配置名称</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="工作配置、个人等"
                    className="h-8"
                  />
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="typography-ui-label text-foreground">颜色</span>
                  <div className="flex gap-1.5">
                    {PROFILE_COLORS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setColor(c.key)}
                        className={cn(
                          'w-6 h-6 rounded-md border-2 transition-all cursor-pointer',
                          color === c.key
                            ? 'border-foreground scale-110'
                            : 'border-transparent hover:border-border'
                        )}
                        style={{ backgroundColor: c.cssVar }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <span className="typography-ui-label text-foreground">图标</span>
                  <div className="flex gap-1.5">
                    {PROFILE_ICONS.map((i) => {
                      const IconComponent = i.Icon;
                      return (
                        <button
                          key={i.key}
                          type="button"
                          onClick={() => setIcon(i.key)}
                          className={cn(
                            'w-7 h-7 rounded-md border-2 transition-all flex items-center justify-center cursor-pointer',
                            icon === i.key
                              ? 'border-[var(--interactive-border)] bg-[var(--surface-muted)]'
                              : 'border-transparent hover:border-[var(--interactive-border)] hover:bg-[var(--surface-muted)]/50'
                          )}
                          title={i.label}
                        >
                          <IconComponent
                            className="w-3.5 h-3.5"
                            style={{ color: icon === i.key ? currentColorValue : 'var(--surface-muted-foreground)' }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Separator */}
            {!isGlobalProfile && <div className="border-t border-border/40" />}

            {/* Git Author */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="typography-ui-label text-foreground">用户名</label>
                  {!isGlobalProfile && <span className="text-[var(--status-error)] text-xs">*</span>}
                  <Tooltip delayDuration={1000}>
                    <TooltipTrigger asChild>
                      <RiInformationLine className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="max-w-xs">
                      显示在 Git 提交记录中的名称。
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="John Doe"
                  required={!isGlobalProfile}
                  readOnly={isGlobalProfile}
                  disabled={isGlobalProfile}
                  className="h-8"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="typography-ui-label text-foreground">邮箱地址</label>
                  {!isGlobalProfile && <span className="text-[var(--status-error)] text-xs">*</span>}
                  <Tooltip delayDuration={1000}>
                    <TooltipTrigger asChild>
                      <RiInformationLine className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent sideOffset={8} className="max-w-xs">
                      应与您在 GitHub/GitLab 中的邮箱一致，以便正确关联贡献。
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="john@example.com"
                  required={!isGlobalProfile}
                  readOnly={isGlobalProfile}
                  disabled={isGlobalProfile}
                  className="h-8"
                />
              </div>
            </div>

            {/* Authentication */}
            {!isGlobalProfile && (
              <>
                <div className="border-t border-border/40" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <span className="typography-ui-label text-foreground">认证方式</span>
                    <div className="flex items-center gap-1">
                      <Button size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setAuthType('ssh')}
                        className={cn(
                          authType === 'ssh'
                            ? 'border-[var(--primary-base)] text-[var(--primary-base)] bg-[var(--primary-base)]/10 hover:text-[var(--primary-base)]'
                            : 'text-foreground'
                        )}
                      >
                        <RiLock2Line className="w-3.5 h-3.5 mr-1" /> SSH
                      </Button>
                      <Button size="sm"
                        type="button"
                        variant="outline"
                        onClick={() => setAuthType('token')}
                        className={cn(
                          authType === 'token'
                            ? 'border-[var(--primary-base)] text-[var(--primary-base)] bg-[var(--primary-base)]/10 hover:text-[var(--primary-base)]'
                            : 'text-foreground'
                        )}
                      >
                        <RiKeyLine className="w-3.5 h-3.5 mr-1" /> Token
                      </Button>
                    </div>
                  </div>

                  {authType === 'ssh' && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="typography-ui-label text-foreground">SSH 密钥路径</label>
                        <Tooltip delayDuration={1000}>
                          <TooltipTrigger asChild>
                            <RiInformationLine className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent sideOffset={8} className="max-w-xs">
                            私钥路径（可选），例如 ~/.ssh/id_ed25519
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        value={sshKey}
                        onChange={(e) => setSshKey(e.target.value)}
                        placeholder="~/.ssh/id_ed25519"
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  )}

                  {authType === 'token' && (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <label className="typography-ui-label text-foreground">主机</label>
                        <span className="text-[var(--status-error)] text-xs">*</span>
                        <Tooltip delayDuration={1000}>
                          <TooltipTrigger asChild>
                            <RiInformationLine className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent sideOffset={8} className="max-w-xs">
                            令牌将从 ~/.git-credentials 中读取该主机的凭据。
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        value={host}
                        onChange={(e) => setHost(e.target.value)}
                        placeholder="github.com"
                        required
                        className="h-8 font-mono text-xs"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2">
            {!isGlobalProfile && !isNewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="text-[var(--status-error)] hover:text-[var(--status-error)] border-[var(--status-error)]/30 hover:bg-[var(--status-error)]/10 mr-auto"
              >
              <RiDeleteBinLine className="w-3.5 h-3.5 mr-1" /> 删除
            </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-foreground hover:bg-interactive-hover hover:text-foreground">
              {isGlobalProfile ? '关闭' : '取消'}
            </Button>
            {!isGlobalProfile && (
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '保存中...' : isNewProfile ? '创建' : '保存'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={(o) => { if (!isDeleting) setIsDeleteDialogOpen(o); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除配置</DialogTitle>
            <DialogDescription>
              确定要删除 "{selectedProfile?.name || name}"？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              取消
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void handleConfirmDelete()} disabled={isDeleting}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
