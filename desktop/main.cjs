const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const PORT = Number(process.env.LABELIT_PORT || 9010);
const HOST = '127.0.0.1';
let backend = null;
let mainWindow = null;

function projectRoot() {
  return path.resolve(__dirname, '..');
}

function devPython() {
  const root = projectRoot();
  const candidates = process.platform === 'win32'
    ? [path.join(root, '.venv', 'Scripts', 'python.exe')]
    : [path.join(root, '.venv', 'bin', 'python3'), path.join(root, '.venv', 'bin', 'python')];
  const envPython = process.env.LABELIT_PYTHON;
  if (envPython) candidates.unshift(envPython);
  return candidates.find(p => fs.existsSync(p)) || (process.platform === 'win32' ? 'python' : 'python3');
}

function backendCommand() {
  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? 'HelloLabelServer.exe' : 'HelloLabelServer';
    return {
      command: path.join(process.resourcesPath, 'backend', exe),
      args: ['--host', HOST, '--port', String(PORT)],
      cwd: path.join(process.resourcesPath, 'backend')
    };
  }
  return {
    command: devPython(),
    args: [path.join(projectRoot(), 'run.py'), '--host', HOST, '--port', String(PORT)],
    cwd: projectRoot()
  };
}

function startBackend() {
  const spec = backendCommand();
  backend = spawn(spec.command, spec.args, {
    cwd: spec.cwd,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, LABELIT_DESKTOP: '1', LABELIT_HOST: HOST, LABELIT_PORT: String(PORT) }
  });
  backend.stdout?.on('data', d => console.log(`[HelloLabel] ${String(d).trimEnd()}`));
  backend.stderr?.on('data', d => console.error(`[HelloLabel] ${String(d).trimEnd()}`));
  backend.on('exit', code => {
    if (!app.isQuitting && code !== 0) {
      console.error(`HelloLabel backend exited with code ${code}`);
    }
  });
}

function stopBackend() {
  if (!backend || backend.killed) return;
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backend.pid), '/t', '/f'], { windowsHide: true });
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
  await mainWindow.loadURL(`http://${HOST}:${PORT}/`);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}


function launchAiInstaller() {
  if (app.isPackaged) {
    return { ok: false, message: 'Runtime AI installation is only available from the HelloLabel source tree.' };
  }
  const root = projectRoot();
  const winScript = path.join(root, 'install_ai.bat');
  const shScript = path.join(root, 'install_ai.sh');

  stopBackend();

  try {
    if (process.platform === 'win32') {
      if (!fs.existsSync(winScript)) throw new Error('install_ai.bat was not found.');
      const psQuote = (value) => `'${String(value).replace(/'/g, "''")}'`;
      const cmdLine = `call "${winScript}"`;
      const ps = `Start-Process -FilePath $env:ComSpec -ArgumentList @('/d','/c',${psQuote(cmdLine)}) -WorkingDirectory ${psQuote(root)}`;
      const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { detached: true, windowsHide: true, stdio: 'ignore' });
      child.unref();
    } else if (process.platform === 'darwin') {
      if (!fs.existsSync(shScript)) throw new Error('install_ai.sh was not found.');
      const command = `sleep 2; cd ${JSON.stringify(root)} && bash ./install_ai.sh`;
      const child = spawn('osascript', ['-e', `tell application "Terminal" to do script ${JSON.stringify(command)}`], { detached: true, stdio: 'ignore' });
      child.unref();
    } else {
      if (!fs.existsSync(shScript)) throw new Error('install_ai.sh was not found.');
      const terminals = [
        ['x-terminal-emulator', ['-e', 'bash', '-lc', `sleep 2; bash ${JSON.stringify(shScript)}`]],
        ['gnome-terminal', ['--', 'bash', '-lc', `sleep 2; bash ${JSON.stringify(shScript)}`]],
        ['konsole', ['-e', 'bash', '-lc', `sleep 2; bash ${JSON.stringify(shScript)}`]]
      ];
      let launched = false;
      for (const [command, args] of terminals) {
        try {
          const child = spawn(command, args, { cwd: root, detached: true, stdio: 'ignore' });
          child.unref();
          launched = true;
          break;
        } catch {}
      }
      if (!launched) {
        const child = spawn('bash', ['-lc', `sleep 2; bash ${JSON.stringify(shScript)}`], { cwd: root, detached: true, stdio: 'ignore' });
        child.unref();
      }
    }
  } catch (err) {
    startBackend();
    return { ok: false, message: err?.message || String(err) };
  }

  setTimeout(() => app.quit(), 700);
  return { ok: true, willExit: true };
}

ipcMain.handle('hellolabel:quit', () => app.quit());
ipcMain.handle('hellolabel:install-ai', () => launchAiInstaller());

app.whenReady().then(async () => {
  try {
    startBackend();
    await waitForServer();
    await createWindow();
  } catch (err) {
    console.error(err);
    stopBackend();
    app.quit();
  }
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  stopBackend();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
