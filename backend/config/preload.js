const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getRol: () => sessionStorage.getItem("userRol"),
    setRol: (rol) => sessionStorage.setItem("userRol", rol)
});