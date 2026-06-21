import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import { readFile } from 'fs/promises';
import { join } from 'path';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'XMind Reader',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In dev mode, load from vite dev server
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }

  createMenu();
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: '文件',
      submenu: [
        {
          label: '打开...',
          accelerator: 'CmdOrCtrl+O',
          click: () => handleOpenFile(),
        },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function handleOpenFile(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'XMind Files', extensions: ['xmind'] }],
  });

  if (result.canceled || result.filePaths.length === 0) return;

  const filePath = result.filePaths[0];
  await sendFileToRenderer(filePath);
}

async function sendFileToRenderer(filePath: string): Promise<void> {
  try {
    const buffer = await readFile(filePath);
    // 将 Buffer 转为 Uint8Array 以确保 IPC 正确传输
    const uint8 = new Uint8Array(buffer);
    mainWindow!.webContents.send('file:opened', {
      filePath,
      buffer: uint8.buffer,
    });
  } catch (err) {
    console.error('Failed to read file:', err);
    mainWindow!.webContents.send('file:error', {
      message: `读取文件失败: ${(err as Error).message}`,
    });
  }
}

// IPC Handlers
ipcMain.handle('file:open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [{ name: 'XMind Files', extensions: ['xmind'] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const buffer = await readFile(filePath);
  const uint8 = new Uint8Array(buffer);
  return { filePath, buffer: uint8.buffer };
});

ipcMain.handle('file:read', async (_event, filePath: string) => {
  const buffer = await readFile(filePath);
  return new Uint8Array(buffer).buffer;
});

ipcMain.handle('file:save-export', async (_event, { data, filename, filters }: any) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: filename,
    filters,
  });
  if (result.canceled) return false;
  return true;
});

// Handle file association / drag-drop open (macOS only)
if (process.platform === 'darwin') {
  app.on('open-file', (event: Electron.Event, filePath: string) => {
    event.preventDefault();
    if (mainWindow) {
      sendFileToRenderer(filePath);
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
