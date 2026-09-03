const { app, BrowserWindow, ipcMain, nativeTheme, dialog } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const HOST = '127.0.0.1';
const PREFERRED_PORT = 19150;
const MAX_PORT_ATTEMPTS = 10;
let mainWindow = null;
let splashWindow = null;
let staticServer = null;
let staticPort = 0;
let closePromptActive = false;
let allowQuitWithoutPrompt = false;

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  allowQuitWithoutPrompt = true;
  app.quit();
}

function isChineseLocale() {
  return (app.getLocale() || '').toLowerCase().startsWith('zh');
}

function staticRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'static')
    : path.resolve(__dirname, '..', 'static');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream', '.tflite': 'application/octet-stream'
};

function safeStaticPath(urlPath) {
  const pathname = decodeURIComponent(String(urlPath || '/').split('?')[0]);
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/static\//, '').replace(/^\/+/, '');
  relative = path.normalize(relative);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  const root = path.resolve(staticRoot());
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep) && target !== root) return null;
  return target;
}

function createStaticServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8', 'Allow': 'GET, HEAD' });
      res.end('Method not allowed');
      return;
    }
    const filePath = safeStaticPath(req.url);
    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }
    fs.stat(filePath, (statErr, stat) => {
      if (statErr || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': ext === '.html' || path.basename(filePath) === 'app.js'
          ? 'no-cache, must-revalidate'
          : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(filePath).pipe(res);
    });
  });
}

function listenOnPort(server, port) {
  return new Promise((resolve, reject) => {
    const onError = error => {
      server.removeListener('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener('error', onError);
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, HOST);
  });
}

async function startStaticServer() {
  if (staticServer) return staticPort;
  let lastError = null;
  for (let offset = 0; offset < MAX_PORT_ATTEMPTS; offset++) {
    const port = PREFERRED_PORT + offset;
    const server = createStaticServer();
    try {
      await listenOnPort(server, port);
      staticServer = server;
      staticPort = port;
      return staticPort;
    } catch (error) {
      lastError = error;
      try { server.close(); } catch {}
      if (error?.code !== 'EADDRINUSE') throw error;
    }
  }
  throw lastError || new Error('No available local port for HelloLabel');
}

function stopStaticServer() {
  if (!staticServer) return;
  try { staticServer.close(); } catch {}
  staticServer = null;
  staticPort = 0;
}

function splashIconDataUrl() {
  try {
    const iconPath = path.join(__dirname, 'build', 'icon.png');
    return `data:image/png;base64,${fs.readFileSync(iconPath).toString('base64')}`;
  } catch { return ''; }
}

async function createSplashWindow() {
  const dark = nativeTheme.shouldUseDarkColors;
  const zh = isChineseLocale();
  const bg = dark ? '#151820' : '#f7f9fc';
  const card = dark ? '#1d222c' : '#ffffff';
  const text = dark ? '#f5f7fb' : '#20242c';
  const muted = dark ? '#aab2c0' : '#77808f';
  const line = dark ? '#303745' : '#e5e9f0';
  const icon = splashIconDataUrl();
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:${bg};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}body{display:grid;place-items:center;user-select:none}.card{width:100%;height:100%;background:${card};display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid ${line};-webkit-app-region:drag}.logo{width:92px;height:92px;object-fit:contain;border-radius:22px;margin-bottom:14px}h1{margin:0;font-size:29px;font-weight:650;color:${text}}.subtitle{margin-top:7px;color:${muted};font-size:13px}.progress{width:250px;height:4px;margin-top:27px;border-radius:99px;overflow:hidden;background:${dark?'#2d3440':'#e9edf3'}}.progress:after{content:'';display:block;width:42%;height:100%;background:linear-gradient(90deg,#67d5e7,#9d91ff);animation:move 1.1s ease-in-out infinite}@keyframes move{0%{transform:translateX(-115%)}100%{transform:translateX(340%)}}</style></head><body><div class="card">${icon?`<img class="logo" src="${icon}">`:''}<h1>HelloLabel</h1><div class="subtitle">${zh?'正在加载本地浏览器运行时…':'Loading local browser runtime…'}</div><div class="progress"></div></div></body></html>`;
  splashWindow = new BrowserWindow({
    width:500,height:310,show:false,frame:false,resizable:false,alwaysOnTop:true,skipTaskbar:true,center:true,backgroundColor:bg,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}
  });
  splashWindow.once('ready-to-show',()=>splashWindow && !splashWindow.isDestroyed() && splashWindow.show());
  splashWindow.on('closed',()=>{splashWindow=null;});
  await splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) splashWindow.destroy();
  splashWindow = null;
}

function quitDialogOptions() {
  return isChineseLocale() ? {
    type:'question', title:'退出 HelloLabel', message:'确定要退出 HelloLabel 吗？', detail:'为防止误操作，请确认是否关闭当前桌面应用。', buttons:['取消','退出'], defaultId:0,cancelId:0,noLink:true
  } : {
    type:'question', title:'Quit HelloLabel', message:'Are you sure you want to quit HelloLabel?', detail:'Please confirm before closing the desktop application.', buttons:['Cancel','Quit'], defaultId:0,cancelId:0,noLink:true
  };
}

async function requestUserQuit() {
  if (allowQuitWithoutPrompt || closePromptActive) return;
  closePromptActive = true;
  try {
    const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const result = parent ? await dialog.showMessageBox(parent, quitDialogOptions()) : await dialog.showMessageBox(quitDialogOptions());
    if (result.response === 1) {
      allowQuitWithoutPrompt = true;
      app.quit();
    }
  } finally {
    closePromptActive = false;
  }
}

async function createWindow() {
  if (!staticPort) await startStaticServer();
  mainWindow = new BrowserWindow({
    width:1500,height:940,minWidth:980,minHeight:680,show:false,
    backgroundColor:nativeTheme.shouldUseDarkColors?'#0f1116':'#eef1f5',
    icon:path.join(__dirname,'build','icon.png'),autoHideMenuBar:true,
    webPreferences:{
      preload:path.join(__dirname,'preload.cjs'),
      contextIsolation:true,
      nodeIntegration:false,
      sandbox:true,
      partition:'persist:hellolabel'
    }
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show',()=>mainWindow && !mainWindow.isDestroyed() && mainWindow.show());
  mainWindow.on('close',event=>{
    if(allowQuitWithoutPrompt)return;
    event.preventDefault();
    void requestUserQuit();
  });
  mainWindow.on('closed',()=>{mainWindow=null;});
  await mainWindow.loadURL(`http://${HOST}:${staticPort}/`);
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) mainWindow.show();
}

ipcMain.handle('hellolabel:quit',()=>{void requestUserQuit();return{ok:true,confirmation:true};});
ipcMain.handle('hellolabel:runtime-info',()=>({
  packaged:app.isPackaged,
  runtime:'browser-only',
  webServer:`http://${HOST}:${staticPort}/`,
  python:false,
  serverAI:false,
  preferredPort:PREFERRED_PORT
}));

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async()=>{
    try {
      await createSplashWindow();
      await startStaticServer();
      await createWindow();
      closeSplashWindow();
    } catch (error) {
      closeSplashWindow();
      dialog.showErrorBox('HelloLabel failed to start', error?.stack || error?.message || String(error));
      allowQuitWithoutPrompt = true;
      app.quit();
    }
    app.on('activate',async()=>{if(BrowserWindow.getAllWindows().length===0)await createWindow();});
  });
}

app.on('before-quit',event=>{
  if(!allowQuitWithoutPrompt){
    event.preventDefault();
    void requestUserQuit();
    return;
  }
  stopStaticServer();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin'){allowQuitWithoutPrompt=true;app.quit();}});
