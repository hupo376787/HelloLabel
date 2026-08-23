const { app, BrowserWindow, ipcMain, nativeTheme, dialog } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.HELLOLABEL_PORT || process.env.LABELIT_PORT || 9010);
const HOST = '127.0.0.1';
const AI_READY_MARKER = '.hellolabel-ai-ready.json';
let backend = null;
let backendMode = 'base';
let mainWindow = null;
let closePromptActive = false;
let allowQuitWithoutPrompt = false;

function desktopLog(message) {
  try {
    const dir = app.getPath('userData');
    fs.mkdirSync(dir, { recursive: true });
    const line = `[${new Date().toISOString()}] ${String(message)}\n`;
    fs.appendFileSync(path.join(dir, 'hellolabel-desktop.log'), line, 'utf8');
  } catch {}
}

function desktopLogPath() {
  try {
    return path.join(app.getPath('userData'), 'hellolabel-desktop.log');
  } catch {
    return '';
  }
}

function projectRoot() {
  return path.resolve(__dirname, '..');
}

function devPython() {
  const root = projectRoot();
  const candidates = process.platform === 'win32'
    ? [path.join(root, '.venv', 'Scripts', 'python.exe')]
    : [path.join(root, '.venv', 'bin', 'python3'), path.join(root, '.venv', 'bin', 'python')];
  const envPython = process.env.HELLOLABEL_PYTHON || process.env.LABELIT_PYTHON;
  if (envPython) candidates.unshift(envPython);
  return candidates.find(p => fs.existsSync(p)) || (process.platform === 'win32' ? 'python' : 'python3');
}

function pythonFromRuntime(runtimeRoot) {
  const candidates = process.platform === 'win32'
    ? [path.join(runtimeRoot, 'python.exe'), path.join(runtimeRoot, 'python3.exe')]
    : [
        path.join(runtimeRoot, 'bin', 'python3.12'),
        path.join(runtimeRoot, 'bin', 'python3'),
        path.join(runtimeRoot, 'bin', 'python')
      ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

function packagedPaths() {
  const userData = app.getPath('userData');
  const dataDir = path.join(userData, 'data');
  const modelsDir = path.join(userData, 'models');
  const cacheDir = path.join(userData, 'cache');
  const configDir = path.join(userData, 'config');
  const appDir = path.join(process.resourcesPath, 'runtime', 'app');
  const baseRuntime = path.join(process.resourcesPath, 'runtime', 'python');
  const aiRuntime = path.join(userData, 'ai-runtime');
  return { userData, dataDir, modelsDir, cacheDir, configDir, appDir, baseRuntime, aiRuntime };
}

function ensurePackagedDirectories(paths) {
  for (const dir of [paths.dataDir, paths.modelsDir, paths.cacheDir, paths.configDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.mkdirSync(path.join(paths.cacheDir, 'pip'), { recursive: true });
  fs.mkdirSync(path.join(paths.cacheDir, 'huggingface'), { recursive: true });
  fs.mkdirSync(path.join(paths.cacheDir, 'torch'), { recursive: true });
  fs.mkdirSync(path.join(paths.configDir, 'ultralytics'), { recursive: true });
}

function aiRuntimeReady(runtimeRoot) {
  const marker = path.join(runtimeRoot, AI_READY_MARKER);
  const python = pythonFromRuntime(runtimeRoot);
  if (!python || !fs.existsSync(marker)) return false;
  try {
    const data = JSON.parse(fs.readFileSync(marker, 'utf8'));
    return data && data.schema === 1 && data.product === 'HelloLabel';
  } catch {
    return false;
  }
}

function backendCommand({ forceBase = false } = {}) {
  if (app.isPackaged) {
    const paths = packagedPaths();
    ensurePackagedDirectories(paths);
    const useAi = !forceBase && aiRuntimeReady(paths.aiRuntime);
    const runtimeRoot = useAi ? paths.aiRuntime : paths.baseRuntime;
    const python = pythonFromRuntime(runtimeRoot);
    if (!python) throw new Error(`HelloLabel bundled Python runtime is missing: ${runtimeRoot}`);

    return {
      command: python,
      args: [path.join(paths.appDir, 'run.py'), '--host', HOST, '--port', String(PORT)],
      cwd: paths.modelsDir,
      mode: useAi ? 'ai' : 'base',
      env: {
        ...process.env,
        HELLOLABEL_DESKTOP: '1',
        HELLOLABEL_HOST: HOST,
        HELLOLABEL_PORT: String(PORT),
        HELLOLABEL_APP_DIR: paths.appDir,
        HELLOLABEL_DATA_DIR: paths.dataDir,
        HELLOLABEL_MODEL_DIR: paths.modelsDir,
        HF_HOME: path.join(paths.cacheDir, 'huggingface'),
        TORCH_HOME: path.join(paths.cacheDir, 'torch'),
        YOLO_CONFIG_DIR: path.join(paths.configDir, 'ultralytics'),
        PIP_CACHE_DIR: path.join(paths.cacheDir, 'pip'),
        PYTHONNOUSERSITE: '1',
        PYTHONDONTWRITEBYTECODE: '1'
      }
    };
  }

  return {
    command: devPython(),
    args: [path.join(projectRoot(), 'run.py'), '--host', HOST, '--port', String(PORT)],
    cwd: projectRoot(),
    mode: 'source',
    env: {
      ...process.env,
      HELLOLABEL_DESKTOP: '1',
      HELLOLABEL_HOST: HOST,
      HELLOLABEL_PORT: String(PORT),
      LABELIT_DESKTOP: '1',
      LABELIT_HOST: HOST,
      LABELIT_PORT: String(PORT)
    }
  };
}

function startBackend(options = {}) {
  const spec = backendCommand(options);
  backendMode = spec.mode;
  backend = spawn(spec.command, spec.args, {
    cwd: spec.cwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: spec.env
  });
  backend.stdout?.on('data', d => {
    const msg = `[HelloLabel:${backendMode}] ${String(d).trimEnd()}`;
    console.log(msg);
    desktopLog(msg);
  });
  backend.stderr?.on('data', d => {
    const msg = `[HelloLabel:${backendMode}] ${String(d).trimEnd()}`;
    console.error(msg);
    desktopLog(msg);
  });
  backend.on('error', err => {
    const msg = `HelloLabel ${backendMode} backend spawn error: ${err?.stack || err}`;
    console.error(msg);
    desktopLog(msg);
  });
  backend.on('exit', code => {
    const msg = `HelloLabel ${backendMode} backend exited with code ${code}`;
    desktopLog(msg);
    if (!app.isQuitting && code !== 0 && code !== null) {
      console.error(msg);
    }
  });
  return backendMode;
}

function stopBackend() {
  if (!backend || backend.killed) {
    backend = null;
    return;
  }
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backend.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
    } else {
      backend.kill('SIGTERM');
    }
  } catch {}
  backend = null;
}

function waitForServer(timeoutMs = 30000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get({ hostname: HOST, port: PORT, path: '/api/health', timeout: 1200 }, res => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('timeout', () => req.destroy());
      req.on('error', retry);
    };
    const retry = () => {
      if (Date.now() - started > timeoutMs) return reject(new Error('HelloLabel backend did not start in time.'));
      setTimeout(probe, 250);
    };
    probe();
  });
}

async function startBackendWithFallback() {
  const mode = startBackend();
  try {
    await waitForServer(mode === 'ai' ? 45000 : 30000);
    return;
  } catch (err) {
    if (app.isPackaged && mode === 'ai') {
      console.error('AI runtime backend failed to start; falling back to the bundled base runtime.', err);
      stopBackend();
      await new Promise(resolve => setTimeout(resolve, 900));
      startBackend({ forceBase: true });
      await waitForServer(30000);
      return;
    }
    throw err;
  }
}

function quitDialogOptions() {
  const zh = (app.getLocale() || '').toLowerCase().startsWith('zh');
  return zh
    ? {
        type: 'question',
        title: '退出 HelloLabel',
        message: '确定要退出 HelloLabel 吗？',
        detail: '为防止误操作，请确认是否关闭当前桌面应用。',
        buttons: ['取消', '退出'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      }
    : {
        type: 'question',
        title: 'Quit HelloLabel',
        message: 'Are you sure you want to quit HelloLabel?',
        detail: 'Please confirm before closing the desktop application.',
        buttons: ['Cancel', 'Quit'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      };
}

async function requestUserQuit() {
  if (allowQuitWithoutPrompt || closePromptActive) return;
  closePromptActive = true;
  try {
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const result = parent
      ? await dialog.showMessageBox(parent, quitDialogOptions())
      : await dialog.showMessageBox(quitDialogOptions());
    if (result.response === 1) {
      allowQuitWithoutPrompt = true;
      app.quit();
    }
  } catch (err) {
    desktopLog(`Quit confirmation failed: ${err?.stack || err}`);
  } finally {
    closePromptActive = false;
  }
}

function quitWithoutPrompt() {
  allowQuitWithoutPrompt = true;
  app.quit();
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0f1116' : '#eef1f5',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });
  mainWindow.on('close', event => {
    if (allowQuitWithoutPrompt) return;
    event.preventDefault();
    void requestUserQuit();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  await mainWindow.loadURL(`http://${HOST}:${PORT}/`);

  // ready-to-show may fire before loadURL() resolves. If that happened, the
  // one-shot event would otherwise be missed and the packaged window stays hidden.
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
    mainWindow.show();
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function winQuote(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function spawnVisibleCommand(command, args, cwd) {
  if (process.platform === 'win32') {
    const commandLine = [command, ...args].map(winQuote).join(' ');
    const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/k', commandLine], {
      cwd,
      detached: true,
      windowsHide: false,
      stdio: 'ignore'
    });
    child.unref();
    return;
  }

  const line = [command, ...args].map(shellQuote).join(' ');
  if (process.platform === 'darwin') {
    const child = spawn('osascript', ['-e', `tell application "Terminal" to do script ${JSON.stringify(`cd ${shellQuote(cwd)} && ${line}`)}`], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return;
  }

  const terminals = [
    ['x-terminal-emulator', ['-e', 'bash', '-lc', line]],
    ['gnome-terminal', ['--', 'bash', '-lc', line]],
    ['konsole', ['-e', 'bash', '-lc', line]]
  ];
  for (const [terminal, terminalArgs] of terminals) {
    try {
      const child = spawn(terminal, terminalArgs, { cwd, detached: true, stdio: 'ignore' });
      child.unref();
      return;
    } catch {}
  }
  const child = spawn('bash', ['-lc', line], { cwd, detached: true, stdio: 'ignore' });
  child.unref();
}

function launchSourceAiInstaller() {
  const root = projectRoot();
  stopBackend();
  if (process.platform === 'win32') {
    const script = path.join(root, 'install_ai.bat');
    if (!fs.existsSync(script)) throw new Error('install_ai.bat was not found.');
    const child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/k', `call "${script}"`], {
      cwd: root, detached: true, windowsHide: false, stdio: 'ignore'
    });
    child.unref();
  } else {
    const script = path.join(root, 'install_ai.sh');
    if (!fs.existsSync(script)) throw new Error('install_ai.sh was not found.');
    spawnVisibleCommand('bash', [script], root);
  }
}

function launchPackagedAiInstaller() {
  const paths = packagedPaths();
  ensurePackagedDirectories(paths);
  const basePython = pythonFromRuntime(paths.baseRuntime);
  const installer = path.join(paths.appDir, 'desktop_ai_installer.py');
  if (!basePython) throw new Error('The bundled HelloLabel Python runtime is missing.');
  if (!fs.existsSync(installer)) throw new Error('The desktop AI installer is missing from this build.');

  stopBackend();
  const args = [
    installer,
    '--base-runtime', paths.baseRuntime,
    '--target-runtime', paths.aiRuntime,
    '--app-dir', paths.appDir,
    '--cache-dir', paths.cacheDir,
    '--config-dir', paths.configDir,
    '--interactive'
  ];
  spawnVisibleCommand(basePython, args, paths.userData);
}

function launchAiInstaller() {
  try {
    if (app.isPackaged) launchPackagedAiInstaller();
    else launchSourceAiInstaller();
  } catch (err) {
    if (!backend) {
      try { startBackend(); } catch {}
    }
    return { ok: false, message: err?.message || String(err) };
  }

  setTimeout(() => quitWithoutPrompt(), 900);
  return { ok: true, willExit: true, packaged: app.isPackaged };
}

ipcMain.handle('hellolabel:quit', () => {
  void requestUserQuit();
  return { ok: true, confirmation: true };
});
ipcMain.handle('hellolabel:install-ai', () => launchAiInstaller());
ipcMain.handle('hellolabel:runtime-info', () => ({
  packaged: app.isPackaged,
  backendMode,
  aiReady: app.isPackaged ? aiRuntimeReady(packagedPaths().aiRuntime) : false
}));

app.whenReady().then(async () => {
  desktopLog(`HelloLabel desktop starting. packaged=${app.isPackaged} resources=${process.resourcesPath}`);
  try {
    await startBackendWithFallback();
    await createWindow();
    desktopLog('Main window created and shown.');
  } catch (err) {
    const details = err?.stack || err?.message || String(err);
    console.error(err);
    desktopLog(`Startup failed: ${details}`);
    stopBackend();
    const logPath = desktopLogPath();
    dialog.showErrorBox(
      'HelloLabel failed to start',
      `${err?.message || String(err)}${logPath ? `\n\nLog: ${logPath}` : ''}`
    );
    quitWithoutPrompt();
  }
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('before-quit', event => {
  if (!allowQuitWithoutPrompt) {
    event.preventDefault();
    void requestUserQuit();
    return;
  }
  app.isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    allowQuitWithoutPrompt = true;
    app.quit();
  }
});
