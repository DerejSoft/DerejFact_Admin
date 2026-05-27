/**
 * DerejFact Admin — Inyector de Recursos Globales
 * Ejecuta la carga del favicon de manera automática en el head
 */
(function() {
    const inyectarFavicon = () => {
        // Evitamos duplicar el favicon si el HTML ya tiene uno por error
        if (document.querySelector("link[rel*='icon']")) return;

        const favicon = document.createElement('link');
        favicon.rel = 'shortcut icon';
        favicon.type = 'image/x-icon';
        
        // Usamos la barra '/' inicial para que la ruta sea absoluta.
        // Así funciona en index.html y en cualquier archivo dentro de pages/
        favicon.href = '/public/img/logo-p.ico'; 
        
        document.head.appendChild(favicon);
    };

    // Si el head ya está listo, lo inyecta de inmediato, si no, espera al parseo
    if (document.head) {
        inyectarFavicon();
    } else {
        document.addEventListener("DOMContentLoaded", inyectarFavicon);
    }
})();