export type OpenInApp = {
  id: string;
  label: string;
  appName: string;
  /** Platforms where this app is available. Undefined = all platforms. */
  platforms?: ('macos' | 'windows' | 'linux')[];
};

export const isWindowsPlatform = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /Windows/i.test(navigator.userAgent || '');
};

export const OPEN_IN_APPS: OpenInApp[] = [
  // macOS-only file managers / terminals
  { id: 'finder', label: 'Finder', appName: 'Finder', platforms: ['macos'] },
  { id: 'terminal', label: 'Terminal', appName: 'Terminal', platforms: ['macos'] },
  { id: 'iterm2', label: 'iTerm2', appName: 'iTerm', platforms: ['macos'] },
  { id: 'ghostty', label: 'Ghostty', appName: 'Ghostty', platforms: ['macos'] },
  // Windows-only file managers / terminals
  { id: 'explorer', label: '文件资源管理器', appName: 'Explorer', platforms: ['windows'] },
  { id: 'cmd', label: '命令提示符', appName: 'cmd', platforms: ['windows'] },
  { id: 'powershell', label: 'PowerShell', appName: 'PowerShell', platforms: ['windows'] },
  { id: 'wt', label: 'Windows Terminal', appName: 'wt', platforms: ['windows'] },
  // Cross-platform editors
  { id: 'vscode', label: 'VS Code', appName: 'Visual Studio Code' },
  { id: 'cursor', label: 'Cursor', appName: 'Cursor' },
  { id: 'windsurf', label: 'Windsurf', appName: 'Windsurf' },
  { id: 'vscodium', label: 'VSCodium', appName: 'VSCodium' },
  { id: 'zed', label: 'Zed', appName: 'Zed', platforms: ['macos', 'linux'] },
  { id: 'sublime-text', label: 'Sublime', appName: 'Sublime Text' },
  // JetBrains
  { id: 'intellij', label: 'IntelliJ', appName: 'IntelliJ IDEA' },
  { id: 'pycharm', label: 'PyCharm', appName: 'PyCharm' },
  { id: 'webstorm', label: 'WebStorm', appName: 'WebStorm' },
  { id: 'rider', label: 'Rider', appName: 'Rider' },
  { id: 'phpstorm', label: 'PhpStorm', appName: 'PhpStorm' },
  { id: 'rustrover', label: 'RustRover', appName: 'RustRover' },
  { id: 'android-studio', label: 'Android Studio', appName: 'Android Studio' },
  // macOS-only
  { id: 'xcode', label: 'Xcode', appName: 'Xcode', platforms: ['macos'] },
  // Others
  { id: 'eclipse', label: 'Eclipse', appName: 'Eclipse' },
  { id: 'visual-studio', label: 'Visual Studio', appName: 'Visual Studio', platforms: ['windows'] },
  { id: 'antigravity', label: 'Antigravity', appName: 'Antigravity' },
  { id: 'trae', label: 'Trae', appName: 'Trae' },
];

export const getPlatformApps = (): OpenInApp[] => {
  const windows = isWindowsPlatform();
  const currentPlatform = windows ? 'windows' : 'macos';
  return OPEN_IN_APPS.filter(
    (app) => !app.platforms || app.platforms.includes(currentPlatform)
  );
};

export const DEFAULT_OPEN_IN_APP_ID = isWindowsPlatform() ? 'explorer' : 'finder';

export const OPEN_IN_ALWAYS_AVAILABLE_APP_IDS: Set<string> = isWindowsPlatform()
  ? new Set(['explorer', 'cmd', 'powershell'])
  : new Set(['finder', 'terminal']);
export const OPEN_DIRECTORY_APP_IDS = new Set(['finder', 'terminal', 'iterm2', 'ghostty']);

export const getOpenInAppById = (id: string | null | undefined): OpenInApp | null => {
  if (!id) {
    return null;
  }
  return OPEN_IN_APPS.find((app) => app.id === id) ?? null;
};

export const getDefaultOpenInApp = (): OpenInApp => {
  return getOpenInAppById(DEFAULT_OPEN_IN_APP_ID) ?? OPEN_IN_APPS[0];
};
