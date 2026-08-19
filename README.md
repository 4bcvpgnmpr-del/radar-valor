# Radar de valor

App web (estática, sin backend) para analizar cuotas de apuestas deportivas: compara la cuota de Bet365 y otras casas contra una probabilidad "justa" calculada, y resalta selecciones con valor esperado positivo. Solo informativa — no procesa apuestas ni dinero.

## 1. Consigue una API key gratuita

1. Ve a https://the-odds-api.com y crea una cuenta (plan gratis: 500 peticiones/mes).
2. Copia tu API key.
3. Abre la app, pégala en el campo de arriba a la derecha y pulsa "Guardar". Se guarda solo en tu navegador (localStorage), nunca sale de tu equipo salvo hacia la propia API de cuotas.

## 2. Probarla en local

Solo necesitas abrir `index.html` en el navegador. Si tu navegador bloquea `fetch` en archivos locales, sirve la carpeta con un servidor simple:

```bash
python3 -m http.server 8000
# luego abre http://localhost:8000
```

## 3. Subirla a GitHub

```bash
cd radar-valor-app
git init
git add .
git commit -m "Primera versión de Radar de valor"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/radar-valor.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub desde github.com/new, sin README ni .gitignore, para que el push no tenga conflictos.)

## 4. Publicarla con GitHub Pages (gratis)

1. En tu repo de GitHub, ve a **Settings → Pages**.
2. En "Source", elige la rama `main` y la carpeta `/ (root)`.
3. Guarda. En un par de minutos tu app estará disponible en:
   `https://TU-USUARIO.github.io/radar-valor/`

## Notas

- Los mercados y ligas disponibles dependen de tu plan en The Odds API; el plan gratis cubre las principales ligas de fútbol.
- Bet365 no siempre ofrece precio para todos los partidos/mercados vía la API — cuando falta, la tabla muestra "—" en esa columna.
- Las notas de cada partido se guardan en tu navegador (localStorage), no se comparten ni se suben a ningún sitio.
