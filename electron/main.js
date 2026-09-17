const { app, BrowserWindow, shell, Menu, Tray, nativeImage, ipcMain, dialog, globalShortcut, Notification } = require("electron");
const path = require("path");
const fs = require("fs");

const APP_URL = "https://claude-enterprise-app.vercel.app";
const isDev = process.argv.includes("--dev");
const LOAD_URL = isDev ? "http://localhost:3000" : APP_URL;

let mainWindow = null;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Claude Enterprise",
    backgroundColor: "#1c1b18",
    frame: true,
    show: false,
    icon: path.join(__dirname, "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  mainWindow.loadURL(LOAD_URL);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in real browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL) && !url.startsWith("http://localhost")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  mainWindow.on("close", (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => { mainWindow = null; });
}

// System Tray
function createTray() {
  try {
    const trayIcon = nativeImage.createFromPath(path.join(__dirname, "icon.png")).resize({ width: 16, height: 16 });
    tray = new Tray(trayIcon);
    tray.setToolTip("Claude Enterprise");
    const menu = Menu.buildFromTemplate([
      { label: "Open Claude Enterprise", click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { label: "New Chat", click: () => { mainWindow?.show(); mainWindow?.webContents.executeJavaScript("window.__newChat && window.__newChat()"); } },
      { type: "separator" },
      { label: "Quit", click: () => { tray = null; app.quit(); } },
    ]);
    tray.setContextMenu(menu);
    tray.on("double-click", () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch (e) { /* icon not found — skip tray */ }
}

// File System IPC
ipcMain.handle("open-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Text & Code Files", extensions: ["txt","md","js","ts","tsx","jsx","py","json","html","css","xml","yaml","yml","csv","sh","bat","env","toml","ini","sql","rs","go","cpp","c","h","php","rb","swift","kt","dart","vue","svelte"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return { path: filePath, name: path.basename(filePath), content };
  } catch (e) { return null; }
});

ipcMain.handle("save-file", async (event, { filePath, content }) => {
  try {
    if (!filePath) {
      const result = await dialog.showSaveDialog(mainWindow, { defaultPath: "untitled.txt" });
      if (result.canceled) return null;
      filePath = result.filePath;
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return filePath;
  } catch (e) { return null; }
});

ipcMain.handle("new-file", async () => {
  const result = await dialog.showSaveDialog(mainWindow, { defaultPath: "untitled.txt" });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, "", "utf-8");
  return { path: result.filePath, name: path.basename(result.filePath), content: "" };
});

ipcMain.handle("get-version", () => app.getVersion());

ipcMain.handle("show-notification", (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// App menu
function buildMenu() {
  const template = [
    { label: "Claude Enterprise", submenu: [
      { label: "About", role: "about" },
      { type: "separator" },
      { label: "Check for Updates...", click: () => shell.openExternal(APP_URL) },
      { type: "separator" },
      { label: "Quit", accelerator: "CmdOrCtrl+Q", click: () => { tray = null; app.quit(); } },
    ]},
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" },
      { role: "selectAll" },
    ]},
    { label: "View", submenu: [
      { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => mainWindow?.reload() },
      { label: "Hard Reload", accelerator: "CmdOrCtrl+Shift+R", click: () => mainWindow?.webContents.reloadIgnoringCache() },
      { type: "separator" },
      { role: "togglefullscreen" },
      { label: "Dev Tools", accelerator: "F12", click: () => mainWindow?.webContents.toggleDevTools() },
      { type: "separator" },
      { label: "Zoom In", accelerator: "CmdOrCtrl+=", role: "zoomIn" },
      { label: "Zoom Out", accelerator: "CmdOrCtrl+-", role: "zoomOut" },
      { label: "Reset Zoom", accelerator: "CmdOrCtrl+0", role: "resetZoom" },
    ]},
    { label: "Window", submenu: [
      { role: "minimize" },
      { label: "Hide to Tray", click: () => mainWindow?.hide() },
      { type: "separator" },
      { label: "Bring All to Front", role: "front" },
    ]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  createTray();

  // Global shortcut: Ctrl+Shift+Space to show/hide
  globalShortcut.register("CmdOrCtrl+Shift+Space", () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else { mainWindow?.show(); mainWindow?.focus(); }
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !tray) app.quit();
});

app.setName("Claude Enterprise");
