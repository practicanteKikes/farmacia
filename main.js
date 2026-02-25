const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. 🏁 FUNCIÓN PARA INICIAR EL SERVIDOR BACKEND
function startServer() {
  try {
    // Usamos path.join con __dirname. 
    // Esto funciona tanto en desarrollo como dentro del archivo 'app.asar' en producción.
    const serverPath = path.join(__dirname, 'backend', 'server.js');
    
    console.log('🚀 Iniciando servidor Backend desde:', serverPath);
    
    // Al hacer 'require', el código de server.js se ejecuta y levanta el servidor en el puerto 3000
    require(serverPath);
    
    console.log('✅ Servidor Backend cargado correctamente.');
  } catch (err) {
    console.error('❌ ERROR FATAL al iniciar el backend:', err);
  }
}

// Iniciamos el servidor INMEDIATAMENTE, antes de crear la ventana
startServer();

// 2. CONFIGURACIÓN DE LA VENTANA PRINCIPAL
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Sistema Farmacia",
    // Icono de la aplicación (asegúrate de que exista en la carpeta build)
    icon: path.join(__dirname, 'build', 'favicon.ico'), 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Necesario para que tu frontend actual funcione sin cambios
      devTools: true // Puedes poner false en producción si no quieres que abran la consola
    },
  });

  // 3. CARGAR EL FRONTEND
  // Cargamos el archivo index.html principal
  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

  // Opcional: Quitar la barra de menú superior (Archivo, Editar, etc.)
  mainWindow.setMenuBarVisibility(false);
  
  // Opcional: Maximizar la ventana al iniciar
  // mainWindow.maximize();
}

// 4. CICLO DE VIDA DE LA APLICACIÓN
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // En macOS, volver a crear la ventana si se hace clic en el dock
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Salir cuando todas las ventanas estén cerradas (excepto en macOS)
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});