document.getElementById('btnTest').addEventListener('click', async () => {
  const res = await fetch('http://localhost:3000/api/test');
  const data = await res.json();
  alert('Respuesta del backend: ' + data.message);
});
document.addEventListener("DOMContentLoaded", () => {
    // 1. Recuperamos el rol que guardamos al hacer login
    const rolUsuario = sessionStorage.getItem("userRol");

    // 2. Si es vendedora, ocultamos funciones de edición
    if (rolUsuario === "vendedora") {
        const elementosProtegidos = document.querySelectorAll(".btn-admin");
        
        elementosProtegidos.forEach(el => {
            el.style.display = "none"; // Oculta el botón por completo
            // Opcional: el.disabled = true;
        });

        // También podemos bloquear los inputs de precio para que no los cambie
        const inputsPrecios = document.querySelectorAll(".input-precio");
        inputsPrecios.forEach(input => input.readOnly = true);
        
        console.log("Acceso restringido: Rol Vendedora detectado.");
    }
});
// Dentro de tu lógica de login en el Renderer
const respuesta = await window.electronAPI.login(user, pass);
if (respuesta.success) {
    // Guardamos el rol globalmente en la sesión del navegador de Electron
    sessionStorage.setItem("userRol", respuesta.user.rol); 
    window.location.href = "productos.html";
}
function cargarInterfazSegunRol() {
    // Recuperamos el rol guardado (debe ser 'admin' o 'vendedora')
    const rol = sessionStorage.getItem("usuarioRol"); 

    if (rol === "vendedora") {
        // Buscamos todos los botones que sirvan para editar o borrar
        // Asegúrate de ponerle la clase 'solo-admin' a esos botones en tu HTML
        const botonesProtegidos = document.querySelectorAll(".solo-admin");
        
        botonesProtegidos.forEach(boton => {
            boton.style.display = "none"; // Los hacemos invisibles
        });

        console.log("🔒 Modo vendedora activo: Edición deshabilitada.");
    }
}

// Llama a esta función cada vez que cargues la lista de productos
document.addEventListener("DOMContentLoaded", cargarInterfazSegunRol);