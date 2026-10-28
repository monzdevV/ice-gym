# Agente lector de facturas

Programa en Python con LangChain que vive en el servidor, **siempre encendido**. Vigila las carpetas de facturas del disco, lee cada factura nueva con Claude (vía OpenRouter) y la guarda en la tabla `facturas` de Supabase, la misma base de datos del CRM.

## Cómo encaja

```
 Carpetas (disco del servidor)        Servidor                     Claude (OpenRouter)
 ┌──────────────────────────┐   ┌──────────────────────────┐   ┌───────────────────────┐
 │ Proveedores/FAC-0153.pdf │──▶│ Agente · agente.py       │──▶│ 1 Lee la factura (OCR) │
 │ Suministros/luz-sept.pdf │   │  · Modelo                │◀──│ 2 Localiza los datos   │
 │ Gastos-viaje/taxi.jpg    │   │  · Prompt del sistema    │   │ 3 Responde en JSON     │
 └──────────────────────────┘   │  · guardar_factura       │   └───────────────────────┘
                                │  · Memoria: ninguna      │
                                │  · Bucle                 │──▶ Supabase (PostgreSQL)
                                └──────────────────────────┘    POST /rest/v1/facturas → INSERT
```

Con cada factura, siempre el mismo bucle:

1. **Disco.** El agente coge el PDF o la foto (jpg, png, webp) de la carpeta.
2. **Claude.** Se la manda con el prompt del sistema y la herramienta `guardar_factura`. Claude la lee (si es una foto, con visión, como un OCR), saca número, fecha, proveedor, NIF, base, IVA y total, y pide usar `guardar_factura` con esos datos en JSON.
3. **INSERT.** El agente ejecuta `guardar_factura`: normaliza los datos y los manda a la API REST de Supabase, que hace el INSERT. Si el NIF coincide con el CIF de una empresa del CRM, la factura queda vinculada a ella (`empresa_id`).
4. **Fin.** Después del INSERT no se vuelve a llamar a Claude.

**Claude nunca toca la base de datos.** Solo pide usar la herramienta; quien la ejecuta y hace el INSERT es el agente. **No hay memoria:** cada factura es una conversación nueva.

### Las partes del agente (en `agente.py`)

| Parte | Qué lleva |
| --- | --- |
| Modelo | `OPENROUTER_MODEL`, por defecto `anthropic/claude-sonnet-5.5`. Para cambiar de modelo basta con cambiar este nombre. |
| Prompt del sistema | `PROMPT_SISTEMA`: las instrucciones fijas que recibe Claude con cada factura. |
| Herramienta | `guardar_factura(numero, fecha, proveedor, nif, base, iva, total)`. La ruta del archivo la añade el agente; Claude no la ve. |
| Memoria | Ninguna. |
| Bucle | `procesar_factura`: agente → Claude → el agente ejecuta la herramienta → fin. |

## Instalación

```bash
cd agente
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux:    source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # y rellena las claves
```

En Supabase, ejecuta una vez `../supabase/facturas.sql` en el SQL Editor. Crea la tabla `facturas` con sus permisos (RLS).

El agente entra con un **usuario del CRM** (rol `authenticated`, sujeto a RLS) y la clave publicable. Nunca usa `service_role`. Lo mejor es crearle un usuario propio, por ejemplo `agente@…`.

## Uso

```bash
python agente.py                          # siempre encendido: vigila ./facturas cada 30 s
python agente.py --intervalo 60           # cada minuto
python agente.py --carpeta /srv/facturas  # otra carpeta raíz (o FACTURAS_CARPETA en .env)
python agente.py --una-vez                # una pasada y termina
python agente.py --dry-run                # una pasada que enseña el JSON sin insertar
```

- Cada factura se guarda una sola vez: el campo `archivo` (p. ej. `Proveedores/FAC-0153.pdf`) es único en la tabla. Si reinicias el agente, salta las facturas que ya estaban guardadas.
- Antes de leer un archivo recién copiado, el agente espera unos segundos a que termine de copiarse.
- Si una factura falla (Claude no responde, red caída…), no se reintenta en cada ronda: vuelve a intentarse cuando cambia el archivo o se reinicia el agente.
- Los archivos no se mueven ni se borran. Las facturas no se suben a Git: solo se versionan las carpetas vacías.

## Dejarlo siempre encendido

**Linux (systemd)**, en `/etc/systemd/system/agente-facturas.service`:

```ini
[Unit]
Description=Agente lector de facturas de Ice Gym
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/srv/ice-gym-crm/agente
ExecStart=/srv/ice-gym-crm/agente/.venv/bin/python agente.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now agente-facturas
journalctl -u agente-facturas -f   # ver lo que hace
```

**Windows:** en el Programador de tareas, crea una tarea que se ejecute «al iniciar el sistema» con `.venv\Scripts\python.exe agente.py`. Pon como carpeta de inicio la carpeta `agente` y marca «Si la tarea no se ejecuta, reiniciar cada 1 minuto».
