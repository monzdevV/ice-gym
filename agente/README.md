# Agente lector de facturas (versión servidor)

Script en Python con LangChain que recorre las carpetas de facturas del disco del servidor, las lee con Claude (vía OpenRouter) y las guarda en la tabla `facturas` de Supabase.

## Cómo encaja

```
facturas/Proveedores/…   ─┐
facturas/Suministros/…   ─┼─▶ 1. DISCO ─▶ 2. CLAUDE ─▶ 3. INSERT (Supabase)
facturas/Gastos-viaje/…  ─┘
```

1. **Disco**: el agente coge cada PDF o foto (jpg, png, webp).
2. **Claude**: recibe la factura y un prompt fijo, y tiene vinculada la herramienta `guardar_factura` (obligatoria). Solo lee y responde con la llamada a la herramienta y los datos: número, fecha, proveedor, NIF, base, IVA y total.
3. **INSERT**: el agente ejecuta `guardar_factura`, normaliza los datos y hace el INSERT en `facturas` con `origen='carpeta'`. Si el NIF coincide con el `cif` de una fila de `empresas`, la vincula con `empresa_id`.

**Claude nunca toca la base de datos.** Solo devuelve la llamada a la herramienta, y quien la ejecuta es el script. No hay memoria: cada factura empieza de cero y, después del INSERT, no se vuelve a llamar a Claude.

El script inicia sesión con un usuario del CRM (rol `authenticated`, sujeto a RLS). No usa `service_role`.

## Instalación

```bash
cd agente
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Linux:    source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # y rellena las claves
```

## Uso

```bash
python agente.py                          # procesa ./facturas
python agente.py --carpeta /srv/facturas  # otra carpeta raíz
python agente.py --dry-run                # extrae y muestra el JSON sin insertar
```

- Las facturas ya guardadas se saltan: se comprueba si `archivo` (la ruta relativa, p. ej. `Proveedores/f-001.pdf`) ya existe en la tabla.
- Los archivos no se mueven ni se borran.
- `--dry-run` no conecta con Supabase.
