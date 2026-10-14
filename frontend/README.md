# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Home screen icon (iPhone and iPad)

Open the deployed app in Safari, tap **Share → Add to Home Screen**, then **Add**.
The app uses the existing Brecos logo through `/apple-touch-icon.png` and launches
with the name Brecos. If an older shortcut shows a screenshot or an old icon,
remove that shortcut and add it again after the updated site is deployed.
Home screen shortcuts require an internet connection to load records.

The opaque square icons are generated from `src/assets/Brecos-logo-finale.png`.
To regenerate them, install Pillow in your Python environment and run
`python3 scripts/generate-icons.py` from `frontend/`.
