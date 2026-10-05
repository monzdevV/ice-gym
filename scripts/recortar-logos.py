"""
Recorta el símbolo de cada logo de la lámina de 41 empresas (Descargas/lgoos.png)
y lo guarda como PNG cuadrado y con fondo transparente en
public/logos/empresas/<slug>.png.

La lámina va en filas (8, 6, 6, 8, 7, 6) y en el mismo orden alfabético que
las empresas. En cada celda se toma el primer bloque con tinta empezando por
arriba (el símbolo) hasta el primer hueco en blanco (donde empieza el texto).
Uso: python scripts/recortar-logos.py <lamina.png>
"""
import sys, unicodedata, re
from PIL import Image

EMPRESAS = [
    "AccesIQ Systems", "Aguas del Moncayo", "Aquatech Solutions", "Brillo Integral Servicios",
    "Club de Remo Poblenou", "Colegio Internacional Montealto", "Costa Brava Resorts", "Coworking La Nave Chamberí",
    "Datalia Software", "Ecolimp Barcelona", "Escuela de Negocios Ágora", "Ferrofit Industrial",
    "Fisiocare Clínicas", "Fitnessport Portugal Lda",
    "Greenshake Bar Solutions", "Hidra Sabores S.L.", "Hotel Mirador del Turia", "Isonova Drinks",
    "Italfit Macchine S.r.l.", "Kinesia Fisioterapia Deportiva",
    "Kinetic Pro Equipment GmbH", "Laboratorios Farmavida", "Logifit Transportes", "Marcaplus Merchandising",
    "Movilapp Studio", "Nexa Ingeniería S.A.", "NutriPeak Suplementos", "Oxígeno Wellness Hoteles",
    "ProteoLab Nutrición", "Pulso Creativo Agencia", "Rentafit Financiación", "Ruzafa Runners Club",
    "Segunda Rep Fitness Outlet", "Seguros Atalaya Correduría", "Solaris Energía Renovable",
    "Supermercados Frescum", "Tecnomant Fitness Service", "Textil Deportivo Levante", "Torniquet Control S.L.",
    "Vendomatic Iberia", "Vigía Seguridad 24h",
]

# (y0, y1, centros x, medio ancho de celda)
FILAS = [
    (15, 150, [95, 290, 475, 670, 865, 1055, 1250, 1440], 95),
    (190, 325, [135, 375, 620, 870, 1120, 1380], 120),
    (360, 505, [135, 390, 650, 880, 1130, 1395], 120),
    (540, 668, [95, 290, 478, 672, 858, 1050, 1240, 1438], 95),
    (712, 840, [105, 315, 528, 748, 972, 1215, 1425], 105),
    (872, 995, [135, 400, 648, 880, 1107, 1370], 120),
]

def slug(t):
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")

def tinta(px):
    r, g, b, a = px
    return a > 40 and min(r, g, b) < 225

# Ajustes por logo (índice desde 0): filas en blanco que cortan el símbolo y,
# si el texto va al lado del símbolo, quedarse con el primer bloque por la izquierda.
HUECO = {10: 1, 16: 1, 22: 1, 27: 1, 34: 1, 35: 1, 40: 1, 13: 14}
SOLO_IZQUIERDA = {11}
# Recorte a mano donde el símbolo y el texto se tocan (x0, y0, x1, y1).
A_MANO = {10: (588, 206, 657, 272), 11: (795, 207, 887, 268), 13: (1342, 214, 1415, 274), 16: (593, 375, 702, 439)}

def simbolo(im, caja, hueco=3, izquierda=False):
    x0, y0, x1, y1 = caja
    filas = []
    for y in range(y0, y1):
        filas.append(any(tinta(im.getpixel((x, y))) for x in range(x0, x1)))
    # primer bloque con tinta y su final (3 filas seguidas en blanco)
    try:
        ini = filas.index(True)
    except ValueError:
        return None
    fin, blancas = ini, 0
    for i in range(ini, len(filas)):
        if filas[i]:
            fin, blancas = i, 0
        else:
            blancas += 1
            if blancas >= hueco:
                break
    ya, yb = y0 + ini, y0 + fin + 1
    cols = [x for x in range(x0, x1) if any(tinta(im.getpixel((x, y))) for y in range(ya, yb))]
    if izquierda:
        corte = next((a for a, b in zip(cols, cols[1:]) if b - a > 4), cols[-1])
        cols = [x for x in cols if x <= corte]
        filas_b = [y for y in range(ya, yb) if any(tinta(im.getpixel((x, y))) for x in cols)]
        ya, yb = min(filas_b), max(filas_b) + 1
    return (min(cols), ya, max(cols) + 1, yb)

def sin_fondo(im):
    """Quita el fondo blanco: «color a alfa» sobre blanco, conservando los bordes suaves."""
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            a0 = max(255 - r, 255 - g, 255 - b) / 255  # cuánto se aleja del blanco
            if a0 >= 0.35:
                continue  # tinta de verdad: se queda tal cual
            if a0 <= 0.02:
                px[x, y] = (255, 255, 255, 0)
                continue
            f = lambda c: max(0, min(255, round((c - 255 * (1 - a0)) / a0)))
            px[x, y] = (f(r), f(g), f(b), round(a * a0 / 0.35))
    return im

def main(ruta):
    im = Image.open(ruta).convert("RGBA")
    cajas = [(c - m, y0, c + m, y1) for (y0, y1, centros, m) in FILAS for c in centros]
    assert len(cajas) == len(EMPRESAS), len(cajas)
    hoja = Image.new("RGBA", (len(EMPRESAS) * 72, 72), "white")
    for i, (nombre, caja) in enumerate(zip(EMPRESAS, cajas)):
        b = A_MANO.get(i) or simbolo(im, caja, HUECO.get(i, 3), i in SOLO_IZQUIERDA)
        recorte = im.crop(b)
        lado = int(max(recorte.size) * 1.28)
        recorte = sin_fondo(recorte.copy())
        lienzo = Image.new("RGBA", (lado, lado), (0, 0, 0, 0))
        lienzo.paste(recorte, ((lado - recorte.width) // 2, (lado - recorte.height) // 2), recorte)
        final = lienzo.resize((128, 128), Image.LANCZOS)
        final.save(f"public/logos/empresas/{slug(nombre)}.png", optimize=True)
        hoja.paste(final.resize((64, 64), Image.LANCZOS), (i * 72 + 4, 4))
    hoja.save(sys.argv[2] if len(sys.argv) > 2 else "logos-hoja.png")
    print(f"{len(EMPRESAS)} logos recortados")

if __name__ == "__main__":
    main(sys.argv[1])
