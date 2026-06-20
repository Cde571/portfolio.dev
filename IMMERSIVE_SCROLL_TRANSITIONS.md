# Immersive Scroll Transitions

Este parche elimina el portal/anillo visual anterior y agrega transiciones por scroll:

- El titulo del hero se desvanece hacia arriba al bajar.
- La imagen del hero se desplaza suavemente hacia la izquierda.
- Las secciones entran desde diferentes direcciones.
- Las tarjetas de repositorios alternan movimiento izquierda/derecha con profundidad.
- Se agrega HUD de progreso estilo consola.

Ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\REMOVE_PORTAL_ADD_IMMERSIVE_SCROLL.ps1
npm run dev
```
