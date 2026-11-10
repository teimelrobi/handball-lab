'use strict';
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const crypto = require('node:crypto');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };
let server;
let desktopDriveToken = '';
const driveStreamNonce = crypto.randomBytes(24).toString('hex');
ipcMain.handle('desktop:drive-stream-url', (event, {fileId, accessToken} = {}) => {
  if (!event.senderFrame?.url?.startsWith('http://127.0.0.1:' + server.address().port + '/')) throw new Error('Nem engedélyezett alkalmazásablak.');
  if (typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) throw new Error('Érvénytelen Google Drive fájlazonosító.');
  if (typeof accessToken !== 'string' || !/^[a-zA-Z0-9._~-]{20,4096}$/.test(accessToken)) throw new Error('Hiányzó Google Drive hozzáférés.');
  desktopDriveToken = accessToken;
  return 'http://127.0.0.1:' + server.address().port + '/__drive_stream/' + driveStreamNonce + '/' + encodeURIComponent(fileId);
});


let oauthPending = false;
ipcMain.handle('desktop:google-drive-auth', async (_event, credentials) => {
  const { clientId, clientSecret } = credentials && typeof credentials === 'object' ? credentials : {};
  if (oauthPending) throw new Error('Már folyamatban van Google Drive bejelentkezés.');
  if (typeof clientId !== 'string' || !/^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new Error('Érvénytelen Google OAuth Desktop Client ID.');
  if (typeof clientSecret !== 'string' || !clientSecret.trim() || clientSecret.length > 512) throw new Error('A Google Desktop OAuth Client Secret megadása szükséges.');
  oauthPending = true;
  const state = crypto.randomBytes(24).toString('base64url');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const scopes = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
  let callbackServer, timeout, redirectUri;
  try {
    const code = await new Promise((resolve, reject) => {
      let finished = false;
      const finish = (error, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (callbackServer) callbackServer.close();
        error ? reject(error) : resolve(result);
      };
      callbackServer = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://127.0.0.1');
        if (url.pathname !== '/oauth2callback') { res.writeHead(404).end(); return; }
        const error = url.searchParams.get('error');
        const valid = url.searchParams.get('state') === state;
        res.writeHead(valid && !error ? 200 : 400, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
        res.end(valid && !error ? '<meta charset="utf-8"><h2>Google Drive összekapcsolva. Visszatérhetsz a KéziStatba.</h2>' : '<meta charset="utf-8"><h2>Google Drive engedélyezés sikertelen.</h2>');
        if (!valid) finish(new Error('Érvénytelen OAuth állapot.'));
        else if (error) finish(new Error('Google engedélyezési hiba: ' + error));
        else if (!url.searchParams.get('code')) finish(new Error('Hiányzó OAuth kód.'));
        else finish(null, url.searchParams.get('code'));
      });
      callbackServer.once('error', finish);
      callbackServer.listen(0, '127.0.0.1', async () => {
        redirectUri = 'http://127.0.0.1:' + callbackServer.address().port + '/oauth2callback';
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        for (const [key, value] of Object.entries({client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope:scopes,code_challenge:challenge,code_challenge_method:'S256',state,access_type:'online',prompt:'consent'})) auth.searchParams.set(key,value);
        try { await shell.openExternal(auth.toString()); } catch (error) { finish(error); }
      });
      timeout = setTimeout(() => finish(new Error('Google engedélyezés időtúllépés (3 perc).')), 180000);
    });
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,code_verifier:verifier,redirect_uri:redirectUri,grant_type:'authorization_code'})
    });
    const token = await response.json();
    if (!response.ok || !token.access_token) throw new Error('Google token hiba: ' + (token.error_description || token.error || response.status));
    return {access_token:token.access_token,expires_in:token.expires_in};
  } finally { oauthPending = false; }
});
function startLocalServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
      catch { res.writeHead(400).end(); return; }
      if (pathname.startsWith('/__drive_stream/')) {
        const match = /^\/__drive_stream\/([a-f0-9]{48})\/([a-zA-Z0-9_-]{10,200})$/.exec(pathname);
        if ((req.method !== 'GET' && req.method !== 'HEAD') || !match || match[1] !== driveStreamNonce || !desktopDriveToken) {
          res.writeHead(403).end(); return;
        }
        const headers = {Authorization:'Bearer ' + desktopDriveToken};
        if (typeof req.headers.range === 'string' && /^bytes=\d+-\d*$/.test(req.headers.range)) headers.Range = req.headers.range;
        const upstream = 'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(match[2]) + '?alt=media';
        fetch(upstream, {method:req.method, headers, signal:AbortSignal.timeout(120000)}).then(response => {
          if (!response.ok && response.status !== 206) {
            res.writeHead(response.status, {'Cache-Control':'no-store','Content-Type':'text/plain; charset=utf-8'});
            res.end('Google Drive videó nem érhető el (' + response.status + ').'); return;
          }
          const out = {'Content-Type':response.headers.get('content-type') || 'video/mp4',
            'Accept-Ranges':'bytes','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
          for (const h of ['content-length','content-range']) if (response.headers.has(h)) out[h] = response.headers.get(h);
          res.writeHead(response.status, out);
          if (req.method === 'HEAD' || !response.body) {res.end();return;}
          const {Readable} = require('node:stream');
          const stream = Readable.fromWeb(response.body);
          stream.on('error', () => {if (!res.destroyed) res.destroy();});
          res.on('close', () => stream.destroy());
          stream.pipe(res);
        }).catch(() => {if (!res.headersSent) res.writeHead(502).end('Drive kapcsolat megszakadt.');else res.destroy();});
        return;
      }
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
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.cjs') }
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
