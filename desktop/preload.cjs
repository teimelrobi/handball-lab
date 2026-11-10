'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('kezistatDesktop', Object.freeze({
  connectGoogleDrive: clientId => ipcRenderer.invoke('desktop:google-drive-auth', clientId)
}));
