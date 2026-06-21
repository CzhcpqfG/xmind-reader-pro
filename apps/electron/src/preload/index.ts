import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  saveExport: (options: any) => ipcRenderer.invoke('file:save-export', options),
  onFileOpened: (callback: (data: { filePath: string; buffer: ArrayBuffer }) => void) => {
    const handler = (_event: any, data: { filePath: string; buffer: ArrayBuffer }) => callback(data);
    ipcRenderer.on('file:opened', handler);
    return () => ipcRenderer.removeListener('file:opened', handler);
  },
  onFileError: (callback: (data: { message: string }) => void) => {
    const handler = (_event: any, data: { message: string }) => callback(data);
    ipcRenderer.on('file:error', handler);
    return () => ipcRenderer.removeListener('file:error', handler);
  },
});
