import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { mainLogger, pythonLogger, ipcLogger } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;

// Запуск Python backend
function startPythonBackend() {
  const pythonPath = process.platform === 'win32' ? 'python' : 'python3';

  pythonLogger.info('Starting Python backend...');

  pythonProcess = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: path.join(__dirname, '..', 'backend'),
    shell: true,
  });

  pythonProcess.stdout?.on('data', (data) => {
    pythonLogger.info(data.toString().trim());
  });

  pythonProcess.stderr?.on('data', (data) => {
    pythonLogger.error(`Python stderr: ${data.toString()}`);
  });

  pythonProcess.on('close', (code) => {
    pythonLogger.warn(`Python backend exited with code ${code}`);
  });
}

// Остановка Python backend
function stopPythonBackend() {
  if (pythonProcess) {
    pythonLogger.info('Stopping Python backend...');
    pythonProcess.kill();
    pythonProcess = null;
    pythonLogger.info('Python backend stopped');
  }
}

function createWindow() {
  mainLogger.info('Creating BrowserWindow...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'PoseFlow Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainLogger.info('BrowserWindow created');

  // В разработке загруем с Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainLogger.info('DEV mode: loading from http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainLogger.info('PROD mode: loading from dist/index.html');
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainLogger.info('Main window closed');
    mainWindow = null;
  });
}

// IPC обработчики
ipcMain.handle('app:info', () => {
  ipcLogger.info('app:info requested');
  return {
    name: 'PoseFlow Editor',
    version: app.getVersion(),
    platform: process.platform,
  };
});

ipcMain.handle('python:health', async () => {
  try {
    const response = await fetch('http://127.0.0.1:8000/health');
    const data = await response.json();
    ipcLogger.info('python:health - OK');
    return data;
  } catch (error) {
    ipcLogger.error('python:health - FAILED', error);
    return { status: 'error', message: error.message };
  }
});

ipcMain.handle('pose:export', async (event, data) => {
  ipcLogger.info('pose:export requested');
  try {
    const response = await fetch('http://127.0.0.1:8000/pose/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    ipcLogger.info('pose:export - success');
    return result;
  } catch (error) {
    ipcLogger.error('pose:export - FAILED', error);
    return { status: 'error', message: error.message };
  }
});

// Тестовый вызов для лога
ipcMain.handle('log:test', (event, message) => {
  ipcLogger.info(`log:test - ${message}`);
  return { status: 'ok', message: 'Logged successfully' };
});

app.whenReady().then(() => {
  mainLogger.info('Application ready');
  startPythonBackend();
  createWindow();

  app.on('activate', () => {
    mainLogger.info('Activate event - ensuring window exists');
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  mainLogger.info('All windows closed');
  stopPythonBackend();
  if (process.platform !== 'darwin') {
    mainLogger.info('Quitting application');
    app.quit();
  }
});

app.on('quit', () => {
  mainLogger.info('Application quitting - cleaning up');
  stopPythonBackend();
});
