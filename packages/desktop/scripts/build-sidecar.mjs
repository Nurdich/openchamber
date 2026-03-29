import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const webDir = path.join(repoRoot, 'packages', 'web');
const desktopTauriDir = path.join(repoRoot, 'packages', 'desktop', 'src-tauri');

const resourcesDir = path.join(desktopTauriDir, 'resources');
const resourcesWebDistDir = path.join(resourcesDir, 'web-dist');
const webDistDir = path.join(webDir, 'dist');

const sidecarsDir = path.join(desktopTauriDir, 'sidecars');

const inferTargetTriple = () => {
  if (typeof process.env.TAURI_ENV_TARGET_TRIPLE === 'string' && process.env.TAURI_ENV_TARGET_TRIPLE.trim()) {
    return process.env.TAURI_ENV_TARGET_TRIPLE.trim();
  }

  if (process.platform === 'darwin') {
    return process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin';
  }

  if (process.platform === 'win32') {
    return 'x86_64-pc-windows-msvc';
  }

  if (process.platform === 'linux') {
    return process.arch === 'arm64' ? 'aarch64-unknown-linux-gnu' : 'x86_64-unknown-linux-gnu';
  }

  return `${process.arch}-${process.platform}`;
};

const targetTriple = inferTargetTriple();

const bunCompileTargetByTriple = {
  'aarch64-apple-darwin': 'bun-darwin-arm64',
  'x86_64-apple-darwin': 'bun-darwin-x64',
  'aarch64-unknown-linux-gnu': 'bun-linux-arm64',
  'x86_64-unknown-linux-gnu': 'bun-linux-x64',
  'x86_64-pc-windows-msvc': 'bun-windows-x64',
};

const compileTarget = bunCompileTargetByTriple[targetTriple];

if (!compileTarget) {
  console.warn(
    `[desktop] unknown target triple '${targetTriple}', falling back to host-arch sidecar build`
  );
}

const sidecarBaseName = process.platform === 'win32'
  ? `openchamber-server-${targetTriple}.exe`
  : `openchamber-server-${targetTriple}`;
const sidecarOutPath = path.join(sidecarsDir, sidecarBaseName);


const run = (cmd, args, cwd) => {
  const result = spawnSync(cmd, args, { cwd, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`);
  }
};

const resolveBun = () => {
  if (typeof process.env.BUN === 'string' && process.env.BUN.trim()) {
    return process.env.BUN.trim();
  }

  const result = spawnSync('/bin/bash', ['-lc', 'command -v bun'], { encoding: 'utf8' });
  const resolved = (result.stdout || '').trim();
  if (resolved) {
    return resolved;
  }

  return 'bun';
};

const bunExe = resolveBun();


const copyDir = async (src, dst) => {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isSymbolicLink()) {
      const link = await fs.readlink(from);
      await fs.symlink(link, to);
    } else {
      await fs.copyFile(from, to);
    }
  }
};

console.log('[desktop] building web UI dist...');
run(bunExe, ['run', 'build'], webDir);

console.log('[desktop] preparing tauri resources...');
await fs.mkdir(resourcesDir, { recursive: true });
await fs.rm(resourcesWebDistDir, { recursive: true, force: true });
await copyDir(webDistDir, resourcesWebDistDir);

console.log('[desktop] building openchamber-server sidecar...');
await fs.mkdir(sidecarsDir, { recursive: true });

const buildArgs = [
  'build',
  '--compile',
  path.join(webDir, 'server', 'index.js'),
  '--outfile',
  sidecarOutPath,
];

if (compileTarget) {
  buildArgs.push('--target', compileTarget);
}

run(bunExe, buildArgs, repoRoot);

if (process.platform !== 'win32') {
  await fs.chmod(sidecarOutPath, 0o755);
}

console.log(`[desktop] sidecar ready: ${sidecarOutPath}`);
console.log(`[desktop] web assets ready: ${resourcesWebDistDir}`);

// Download opencode-cli to exe directory (same as sidecar)
// Tauri expects: opencode-x86_64-pc-windows-msvc.exe (triple replaces .exe suffix)
const opencodeCliBaseName = process.platform === 'win32'
  ? `opencode-${targetTriple}.exe`
  : `opencode-${targetTriple}`;
const opencodeCliOutPath = path.join(sidecarsDir, opencodeCliBaseName);

const getOpencodeDownloadUrl = () => {
  const os = process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'windows' : 'linux';
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64';
  const ext = os === 'linux' ? '.tar.gz' : '.zip';
  return `https://github.com/anomalyco/opencode/releases/latest/download/opencode-${os}-${arch}${ext}`;
};

const downloadOpencodeCli = async () => {
  const url = getOpencodeDownloadUrl();
  console.log(`[desktop] downloading opencode-cli from ${url}...`);
  
  const { execSync } = await import('node:child_process');
  
  // Create temp dir
  const tmpDir = path.join(desktopTauriDir, 'tmp-opencode');
  await fs.mkdir(tmpDir, { recursive: true });
  const archivePath = path.join(tmpDir, `opencode-archive${url.endsWith('.tar.gz') ? '.tar.gz' : '.zip'}`);
  
  // Download with curl
  try {
    execSync(`curl -# -L -o "${archivePath}" "${url}"`, { stdio: 'inherit' });
  } catch (e) {
    console.warn('[desktop] failed to download opencode-cli, continuing without it');
    return;
  }
  
  // Extract
  if (url.endsWith('.tar.gz')) {
    execSync(`tar -xzf "${archivePath}" -C "${tmpDir}"`, { stdio: 'inherit' });
  } else {
    execSync(`unzip -q -o "${archivePath}" -d "${tmpDir}"`, { stdio: 'inherit' });
  }
  
  // Find the opencode binary in extracted files
  const extractedDir = await fs.readdir(tmpDir);
  let opencodeBinPath = null;
  for (const item of extractedDir) {
    const itemPath = path.join(tmpDir, item);
    const stat = await fs.stat(itemPath);
    if (stat.isFile() && (item === 'opencode' || item === 'opencode.exe')) {
      opencodeBinPath = itemPath;
      break;
    }
    if (stat.isDirectory() && (item === 'opencode' || item === 'opencode.exe')) {
      const nestedPath = path.join(itemPath, process.platform === 'win32' ? 'opencode.exe' : 'opencode');
      if (await fs.access(nestedPath).then(() => true).catch(() => false)) {
        opencodeBinPath = nestedPath;
        break;
      }
    }
  }
  
  if (!opencodeBinPath) {
    // Try looking in subdirectories
    for (const item of extractedDir) {
      const itemPath = path.join(tmpDir, item);
      const stat = await fs.stat(itemPath);
      if (stat.isDirectory()) {
        const files = await fs.readdir(itemPath);
        for (const f of files) {
          if (f === 'opencode' || f === 'opencode.exe') {
            opencodeBinPath = path.join(itemPath, f);
            break;
          }
        }
      }
      if (opencodeBinPath) break;
    }
  }
  
  if (opencodeBinPath) {
    await fs.copyFile(opencodeBinPath, opencodeCliOutPath);
    if (process.platform !== 'win32') {
      await fs.chmod(opencodeCliOutPath, 0o755);
    }
    console.log(`[desktop] opencode-cli ready: ${opencodeCliOutPath}`);
  } else {
    console.warn('[desktop] could not find opencode binary in archive, skipping');
  }
  
  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
};

await downloadOpencodeCli();
