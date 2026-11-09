'use strict';
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
let server;
function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
      catch { res.writeHead(400).end(); return; }
      // Keep legacy absolute /handball-lab/* asset references working.
      if (pathname.startsWith('/handball-lab/')) pathname = pathname.slice('/handball-lab'.length);
      const target = path.resolve(root, '.' + pathname);
      if (target !== root && !target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const file = pathname === '/' ? path.join(root, 'index.html') : target;
      fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) { res.writeHead(404).end(); return; }
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        fs.createReadStream(file).pipe(res);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port + '/'));
  });
}
app.whenReady().then(async () => {
  const url = await startLocalServer();
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https:\/\//i.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });
  await win.loadURL(url);
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) win.show(); });
}).catch(error => { console.error(error); app.quit(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (server) server.close(); });
