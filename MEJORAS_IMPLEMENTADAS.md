# Mejoras implementadas

- Se conservaron la estructura e identidad visual original del portafolio arcade/pixel.
- Se integraron 54 repositorios públicos como tarjetas completas.
- Se corrigió el acceso al repositorio: imagen, botón y card pueden abrir el repo real.
- Se cambió el botón a `Repositorio` y se usa `noopener noreferrer` para apertura segura en nueva pestaña.
- Se generó una miniatura PNG individual para cada repositorio en `public/projects/covers/`.
- Se agregó metadata visual por tarjeta: lenguaje y fecha de actualización.
- Se agregó buscador por texto y filtros por lenguaje sin romper la UI base.
- Se agregó efecto de scroll/stagger en repos: aparición escalonada, brillo focal y parallax suave de miniaturas.
- Se actualizó `REPOS.md` y `projects-manifest.json` como inventario del portafolio.

## Próximas mejoras recomendadas

1. Agregar demos/Vercel por proyecto cuando cada repo tenga deploy.
2. Añadir `README` corto y screenshot real dentro de cada repo principal.
3. Crear badges por estado: `Demo`, `API`, `AI`, `Academic`, `Three.js`.
4. Conectar GitHub API en runtime para actualizar stars/languages automáticamente.
5. Agregar Open Graph dinámico para compartir cada proyecto como card.
