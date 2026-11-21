'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kezistatDesktop', Object.freeze({
  connectGoogleDrive: credentials => ipcRenderer.invoke('desktop:google-drive-auth', credentials)
}));
