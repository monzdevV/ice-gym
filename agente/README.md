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
| Bucle | `leer_con_claude` y `guardar`: agente → Claude → el agente ejecuta la herramienta → fin. `Agente.ronda` repite esto con cada factura nueva. |

## Instalación

1. Entra en la carpeta y crea un entorno virtual:

   ```bash
   cd agente
   python -m venv .venv
   ```

2. Actívalo. En Windows: `.venv\Scriptsctivate`. En Linux: `source .venv/bin/activate`.
3. Instala las dependencias: `pip install -r requirements.txt`.
4. Copia `.env.example` a `.env` (Windows: `copy .env.example .env`; Linux: `cp .env.example .env`) y rellena los valores. El archivo `.env` no se sube a Git.
5. En Supabase, ejecuta una vez `../supabase/facturas.sql` en el SQL Editor. Crea la tabla `facturas` con sus permisos (RLS).
6. Crea en Supabase (Authentication → Users) un usuario propio para el agente, por ejemplo `agente@…`, y pon su correo y contraseña en `.env`.
7. Prueba sin guardar nada: deja una factura en `facturas/Proveedores/` y ejecuta `python agente.py --dry-run`. Verás el JSON que saca Claude.
8. Prueba de verdad: `python agente.py --una-vez`. La factura debe aparecer en la pantalla de facturas del CRM.

El agente entra con un **usuario del CRM** (rol `authenticated`, sujeto a RLS) y la **clave publicable**. Nunca usa `service_role` ni una clave `sb_secret_…`: si la pones por error, el agente no arranca.

## Uso

```bash
python agente.py                          # siempre encendido: vigila ./facturas cada 30 s
python agente.py --intervalo 60           # cada minuto
python agente.py --carpeta /srv/facturas  # otra carpeta raíz (o FACTURAS_CARPETA en .env)
python agente.py --una-vez                # una pasada y termina
python agente.py --dry-run                # una pasada que enseña el JSON sin insertar (no conecta con Supabase)
```

- **Una sola vez por factura.** El campo `archivo` (p. ej. `Proveedores/FAC-0153.pdf`) es único en la tabla. Si reinicias el agente, salta las facturas que ya estaban guardadas sin volver a llamar a Claude.
- **Origen.** El agente guarda con `origen = 'carpeta'`. Las facturas subidas desde la pantalla del CRM llevan `origen = 'crm'` y su `archivo` es `crm/<id>.<ext>` en el almacén. Por eso **no crees una subcarpeta `crm`** en la carpeta de facturas: el agente la ignora.
- **Archivos a medio copiar.** Un archivo sólo se lee cuando no ha cambiado entre dos rondas y lleva al menos 10 segundos sin modificarse.
- **Errores.** Si una factura falla (Claude no responde, red caída…), se reintenta hasta 3 veces con espera creciente (2, 4 minutos). Si lo que falló fue guardar en Supabase, el reintento no vuelve a llamar a Claude. Después se deja hasta que el archivo cambie o se reinicie el agente. Si Supabase no responde, la ronda entera se repite en la siguiente.
- **Sesión.** El token de Supabase se renueva solo antes de cada uso; si caduca del todo, el agente vuelve a entrar con el usuario de `.env`.
- **Tamaño máximo.** PDF hasta 20 MB y fotos hasta 5 MB (límites de Claude). Los más grandes se saltan con un aviso en el registro.
- **Qué se ignora.** Archivos ocultos (`.algo`), temporales de Office (`~$algo`) y cualquier formato que no sea PDF, JPG, PNG o WEBP.
- Los archivos no se mueven ni se borran. Las facturas no se suben a Git: sólo se versionan las carpetas vacías.
- El registro nunca muestra claves ni contraseñas: sólo nombres de archivo y los datos de cada factura.

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

**Windows:** en el Programador de tareas, crea una tarea que se ejecute «al iniciar el sistema» con `.venv\Scripts\python.exe agente.py`. Pon como carpeta de inicio («Iniciar en») la carpeta `agente`, marca «Ejecutar tanto si el usuario inició sesión como si no» y, en Configuración, «Si la tarea no se ejecuta correctamente, reiniciar cada: 1 minuto». Quita también «Detener la tarea si se ejecuta durante más de…», porque el agente no termina nunca.
