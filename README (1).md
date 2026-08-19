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

## Mercados y casas incluidas

- Casas: Pinnacle (referencia de precio justo, la más ajustada del mercado), William Hill, Unibet y bwin.
- Bet365 no está incluida: no ofrece API pública ni licencia sus datos a terceros, así que ningún comparador legítimo puede mostrar sus cuotas en tiempo real.
- Mercados principales (1X2, hándicap, más/menos goles) se cargan automáticamente. Mercados adicionales (ambos anotan, doble oportunidad, empate anula apuesta) se cargan bajo demanda con el botón "Cargar más mercados" de cada partido, porque consumen más cuota de la API.

## Bajas por lesión o sanción (opcional)

1. Regístrate gratis en https://www.api-football.com (plan gratuito: 100 peticiones/día).
2. Pega esa segunda API key en el campo correspondiente de la app.
3. En cada partido, pulsa "Ver bajas y sanciones" para consultar automáticamente las bajas registradas de ambos equipos.

Esta consulta depende de que los nombres de equipo coincidan entre ambas APIs; en ligas o equipos poco comunes puede no encontrar coincidencia exacta.

## Nuevas funciones

- **Stake sugerido (Kelly):** define tu bankroll y una fracción de Kelly (100/50/25%) arriba a la derecha. Cada selección con valor muestra cuánto apostar según tu edge — el Kelly fraccionado (25-50%) es más conservador y lo que usan casi todos los apostadores serios, porque el Kelly completo es muy agresivo.
- **Seguimiento de CLV:** pulsa "Registrar" junto a cualquier selección con valor para guardarla. Antes de que empiece el partido, entra en la pestaña "Historial y CLV" y pulsa "Actualizar cierre" para comparar tu cuota contra la cuota de cierre. Un CLV positivo sostenido en el tiempo es la métrica más fiable de que tu criterio realmente tiene edge — mucho más que si ganaste o perdiste una apuesta suelta.
- **Forma reciente:** botón "Forma reciente" en cada partido, muestra los últimos 5 resultados y goles a favor/en contra de cada equipo (requiere la key de api-football.com).
- **Historial de value bets:** cada vez que actualizas cuotas, cualquier selección que supere el umbral de valor queda registrada automáticamente en "Historial y CLV", para que puedas revisar con el tiempo cuántas veces el modelo detectó valor y cómo les fue.

## Notas

- Los mercados y ligas disponibles dependen de tu plan en The Odds API; el plan gratis cubre las principales ligas de fútbol.
- Las notas manuales de cada partido se guardan en tu navegador (localStorage), no se comparten ni se suben a ningún sitio.

## Nuevas funciones (versión con menús)

- **Casas mostradas:** solo ves cuotas de **bwin** y **Betfair**. Pinnacle y William Hill se siguen consultando por detrás únicamente para calcular la probabilidad justa del mercado (cuantas más casas de referencia, más fiable el cálculo).
- **Alertas en dos niveles:**
  - VALOR — edge entre 2% y 15%, lo normal en value betting.
  - POSIBLE ERROR — edge por encima del 15%, señal de que la cuota puede ser un error de precio de la casa (suele corregirse rápido, conviene mirarlo cuanto antes).
  Arriba de la lista de partidos aparece un resumen con cuántas alertas de cada tipo hay activas.
- **Menús:** Partidos / Historial y CLV / Estadísticas / Widgets, en vez de todo junto.
- **Estadísticas y backtesting:** en "Estadísticas" ves totales, tu CLV promedio, y puedes marcar como "Ganada" o "Perdida" cada value bet detectado para simular cómo te habría ido apostando siempre con stake fijo del 1% del bankroll, con una curva de bankroll simulada.
- **Widgets de API-Football:** clasificación de la liga y partidos del día con estadísticas oficiales (goles, faltas, tarjetas), usando los widgets embebibles oficiales de api-football.com.

**Nota sobre Betfair:** la clave exacta que usa The Odds API para Betfair puede variar (`betfair_ex_eu` para el exchange, u otra para el sportsbook). Si al cargar no ves cuotas de Betfair, dímelo y ajustamos la clave.
