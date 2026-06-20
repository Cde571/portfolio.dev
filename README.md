# Cristian Echeverry — Arcade Developer Portfolio

Portfolio personal de Cristian Echeverry con estética arcade/pixel, construido con Astro y orientado a mostrar proyectos reales, experiencia, stack técnico y enlaces directos a GitHub.

## Características principales

- Landing page responsive con identidad visual arcade.
- Secciones separadas en componentes Astro: navegación, hero, estadísticas, proyectos, about, GitHub, contacto y experiencia.
- Tarjetas de proyectos conectadas a repositorios reales de GitHub.
- CTA funcionales para contacto, hoja de vida y repositorios.
- Estadísticas visibles basadas en el perfil público de GitHub, sin contador local falso de visitas.
- Efectos visuales conservados, pero sin `backdrop-filter` borroso para evitar movimiento visual extraño al hacer scroll.
- Consola arcade interactiva y widget de contacto pixel-art.

## Stack

- Astro
- TypeScript
- Tailwind CSS
- HTML/CSS
- JavaScript

## Estructura relevante

```text
src/
├── components/
│   ├── ArcadePortfolio.astro
│   ├── PixelConsole.astro
│   └── astro/
│       ├── Navigation.astro
│       ├── Hero.astro
│       ├── Stats.astro
│       ├── Projects.astro
│       ├── ProjectCard.astro
│       ├── About.astro
│       ├── GitHubStats.astro
│       ├── Contact.astro
│       ├── Experience.astro
│       ├── PixelChat.astro
│       └── ScrollIndicator.astro
├── data/
│   └── projects.ts
├── layouts/
│   └── Layout.astro
└── pages/
    └── index.astro
```

## Instalación

```bash
npm install
```

En PowerShell, si Windows bloquea `npm.ps1`, usa:

```powershell
npm.cmd install
```

## Desarrollo local

```bash
npm run dev
```

O en PowerShell:

```powershell
npm.cmd run dev
```

Astro normalmente abre el proyecto en:

```text
http://localhost:4321
```

## Build de producción

```bash
npm run build
```

## Vista previa de producción

```bash
npm run preview
```

## Repositorios enlazados

- Perfil: https://github.com/Cde571
- Repositorios: https://github.com/Cde571?tab=repositories
- Portfolio: https://github.com/Cde571/portfolio.dev
- FoodEmotions: https://github.com/Cde571/food-emotions
- FoodEmotions backend: https://github.com/Cde571/foodemotions--back
- Cameras Security: https://github.com/Cde571/cameras-security
- World Cup frontend: https://github.com/Cde571/WordCup2026-frontend
- World Cup backend: https://github.com/Cde571/API-BACKEND-WORDCUP
- BankApp: https://github.com/Cde571/bankapp
- Proyecto sustituto ML: https://github.com/Cde571/proyecto_sustituto

## Deploy recomendado

El proyecto puede desplegarse en Vercel como sitio Astro estático.

1. Subir el repositorio a GitHub.
2. Importarlo desde Vercel.
3. Usar los comandos por defecto:

```text
Build command: npm run build
Output directory: dist
```

## Autor

Cristian Echeverry González  
GitHub: https://github.com/Cde571


## Versión completada con repositorios

Se mantuvo la interfaz original del portafolio y se agregaron los repositorios públicos visibles del perfil `Cde571` como tarjetas ordenadas con:

- Link directo al repositorio.
- Miniatura uniforme en `public/projects/covers/`.
- Lenguaje, categoría, descripción y fecha de actualización.
- Archivo `REPOS.md` con la tabla completa de enlaces.

### Correr localmente

```powershell
npm install
npm run dev
```

Abrir `http://localhost:4321`.


## Actualización repositorios + miniaturas

Esta versión mantiene el modelo visual original y agrega una sección de proyectos más completa:

- 54 repositorios conectados con enlace directo a GitHub.
- Botón `Repositorio` corregido para abrir el repo real.
- Miniatura PNG generada para cada proyecto.
- Búsqueda y filtros por lenguaje.
- Scroll effects suaves en las tarjetas de repositorios.

### Correr localmente

```powershell
npm install
npm run dev
```

Abrir `http://localhost:4321`.
