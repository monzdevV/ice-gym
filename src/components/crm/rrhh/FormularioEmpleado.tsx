"use client";

import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowsClockwise, Camera, Eye, EyeSlash, PencilSimple, Plus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/crm/b2b/Piezas";
import { Campo } from "@/components/crm/contactos/FormularioContacto";
import { claseBotonPrincipal, claseCampo, claseError } from "@/components/crm/Primitivas";
import { guardarEmpleado } from "@/app/crm/acciones/rrhh";
import type { Resultado } from "@/app/crm/acciones/b2b";
import {
  DESCRIPCION_ROL,
  ESTADOS_EMPLEADO,
  ETIQUETA_ESTADO_EMPLEADO,
  ETIQUETA_ROL,
  ROLES,
  hoyMadrid,
  nombreEmpleado,
  rutaRrhh,
  usuarioSugerido,
  type Empleado,
  type EmpleadoMini,
} from "@/lib/rrhh";
import { claseBotonSecundarioRrhh } from "./Piezas";

export type Sugerencias = { departamentos: string[]; puestos: string[] };

const select = `${claseCampo} appearance-none`;

function Enviar({ texto, pendienteTexto }: { texto: string; pendienteTexto: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={claseBotonPrincipal}>
      {pending ? pendienteTexto : texto}
    </button>
  );
}

/** Contraseña inicial aleatoria: 12 caracteres sin ambigüedades (sin 0/O ni 1/l). */
function generarPassword() {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const cifras = "23456789";
  const todo = letras + cifras;
  const r = crypto.getRandomValues(new Uint32Array(12));
  const base = Array.from(r, (n) => todo[n % todo.length]);
  base[3] = cifras[r[3] % cifras.length];
  base[8] = letras[r[8] % letras.length];
  return base.join("");
}

function Titulo({ children }: { children: React.ReactNode }) {
  return <p className="border-b border-linea pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wider text-tinta-2">{children}</p>;
}

/** Campos de la ficha del empleado. En el alta incluye la cuenta del CRM. */
function CamposEmpleado({
  inicial,
  directorio,
  sugerencias,
  estado,
  onCancelar,
  textoEnviar,
  textoPendiente,
}: {
  inicial?: Empleado;
  directorio: EmpleadoMini[];
  sugerencias: Sugerencias;
  estado: Resultado | null;
  onCancelar: () => void;
  textoEnviar: string;
  textoPendiente: string;
}) {
  const id = useId();
  const alta = !inicial;
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [apellidos, setApellidos] = useState(inicial?.apellidos ?? "");
  const [email, setEmail] = useState(inicial?.email ?? "");
  const [foto, setFoto] = useState<string | null>(null);
  const [crearCuenta, setCrearCuenta] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [usuarioTocado, setUsuarioTocado] = useState(false);
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [comercial, setComercial] = useState(false);
  const [rol, setRol] = useState(inicial?.rol ?? "empleado");

  const usuarioMostrado = usuarioTocado ? usuario : usuarioSugerido(email);
  const fotoActual = foto ?? directorio.find((e) => e.id === inicial?.id)?.foto_url ?? null;
  // No se puede elegir como jefe a uno mismo.
  const jefes = directorio.filter((e) => e.id !== inicial?.id && (e.estado === "activo" || e.id === inicial?.jefe_id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-lg border border-linea bg-placa-2/50 p-3">
        <Avatar nombre={nombre || "?"} apellidos={apellidos} url={fotoActual} tamano="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-tinta">{nombreEmpleado({ nombre: nombre || "Nuevo empleado", apellidos })}</p>
          <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-medium text-acento-tinta hover:underline">
            <Camera className="size-4" aria-hidden />
            {fotoActual ? "Cambiar fotografía" : "Añadir fotografía"}
            <input
              type="file"
              name="foto"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFoto(f ? URL.createObjectURL(f) : null);
              }}
            />
          </label>
          <p className="text-xs text-tinta-2">JPG, PNG o WebP · máx. 5 MB</p>
        </div>
      </div>

      <Titulo>Datos personales</Titulo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Nombre" htmlFor={`${id}-nombre`}>
          <input id={`${id}-nombre`} name="nombre" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="off" className={claseCampo} autoFocus />
        </Campo>
        <Campo etiqueta="Apellidos" htmlFor={`${id}-apellidos`}>
          <input id={`${id}-apellidos`} name="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="DNI / NIE" htmlFor={`${id}-documento`}>
          <input id={`${id}-documento`} name="documento" defaultValue={inicial?.documento ?? ""} placeholder="12345678Z" autoComplete="off" className={`${claseCampo} uppercase`} />
        </Campo>
        <Campo etiqueta="Fecha de nacimiento" htmlFor={`${id}-nacimiento`}>
          <input id={`${id}-nacimiento`} type="date" name="fecha_nacimiento" defaultValue={inicial?.fecha_nacimiento ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="Email" htmlFor={`${id}-email`}>
          <input id={`${id}-email`} type="email" name="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor={`${id}-telefono`}>
          <input id={`${id}-telefono`} type="tel" name="telefono" defaultValue={inicial?.telefono ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Dirección" htmlFor={`${id}-direccion`} className="sm:col-span-2">
          <input id={`${id}-direccion`} name="direccion" defaultValue={inicial?.direccion ?? ""} autoComplete="off" className={claseCampo} />
        </Campo>
        <Campo etiqueta="Contacto de emergencia" htmlFor={`${id}-emergencia`} className="sm:col-span-2">
          <input id={`${id}-emergencia`} name="contacto_emergencia" defaultValue={inicial?.contacto_emergencia ?? ""} placeholder="Nombre, relación y teléfono" autoComplete="off" className={claseCampo} />
        </Campo>
      </div>

      <Titulo>Puesto</Titulo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etiqueta="Puesto" htmlFor={`${id}-puesto`}>
          <input id={`${id}-puesto`} name="puesto" list={`${id}-puestos`} defaultValue={inicial?.puesto ?? ""} placeholder="Recepción, Entrenador…" autoComplete="off" className={claseCampo} />
          <datalist id={`${id}-puestos`}>
            {sugerencias.puestos.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Campo>
        <Campo etiqueta="Departamento" htmlFor={`${id}-departamento`}>
          <input id={`${id}-departamento`} name="departamento" list={`${id}-departamentos`} defaultValue={inicial?.departamento ?? ""} placeholder="Operaciones, Comercial…" autoComplete="off" className={claseCampo} />
          <datalist id={`${id}-departamentos`}>
            {sugerencias.departamentos.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </Campo>
        <Campo etiqueta="Responsable / jefe" htmlFor={`${id}-jefe`} className="sm:col-span-2">
          <select id={`${id}-jefe`} name="jefe_id" defaultValue={inicial?.jefe_id ?? ""} className={select}>
            <option value="">Sin responsable</option>
            {jefes.map((e) => (
              <option key={e.id} value={e.id}>
                {nombreEmpleado(e)}
                {e.puesto ? ` · ${e.puesto}` : ""}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Fecha de alta" htmlFor={`${id}-alta`}>
          <input id={`${id}-alta`} type="date" name="fecha_alta" required defaultValue={inicial?.fecha_alta ?? hoyMadrid()} className={claseCampo} />
        </Campo>
        <Campo etiqueta="Fecha de baja" htmlFor={`${id}-baja`}>
          <input id={`${id}-baja`} type="date" name="fecha_baja" defaultValue={inicial?.fecha_baja ?? ""} className={claseCampo} />
        </Campo>
        <Campo etiqueta="Días de vacaciones al año" htmlFor={`${id}-dias`}>
          <input id={`${id}-dias`} type="number" name="dias_vacaciones" min={0} max={60} defaultValue={inicial?.dias_vacaciones ?? 22} className={claseCampo} />
        </Campo>
        {!alta && (
          <Campo etiqueta="Estado" htmlFor={`${id}-estado`}>
            <select id={`${id}-estado`} name="estado" defaultValue={inicial.estado} className={select}>
              {ESTADOS_EMPLEADO.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETA_ESTADO_EMPLEADO[e]}
                </option>
              ))}
            </select>
          </Campo>
        )}
      </div>

      <Titulo>Permisos en el CRM</Titulo>
      <Campo etiqueta="Rol" htmlFor={`${id}-rol`}>
        <select id={`${id}-rol`} name="rol" value={rol} onChange={(e) => setRol(e.target.value as typeof rol)} className={select}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ETIQUETA_ROL[r]}
            </option>
          ))}
        </select>
        <span className="text-xs text-tinta-2">{DESCRIPCION_ROL[rol]}</span>
      </Campo>

      {alta && (
        <div className="flex flex-col gap-3 rounded-lg border border-linea p-3">
          <label htmlFor={`${id}-cuenta`} className="flex items-start justify-between gap-3">
            <span>
              <span className="block text-sm font-medium text-tinta">Crear cuenta de acceso al CRM</span>
              <span className="block text-xs text-tinta-2">Queda vinculada a esta ficha. La contraseña se guarda cifrada y no se vuelve a mostrar.</span>
            </span>
            <Switch id={`${id}-cuenta`} checked={crearCuenta} onCheckedChange={setCrearCuenta} />
          </label>
          <input type="hidden" name="crear_cuenta" value={crearCuenta ? "si" : "no"} />
          {crearCuenta && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Nombre de usuario" htmlFor={`${id}-usuario`}>
                <input
                  id={`${id}-usuario`}
                  name="usuario"
                  required
                  pattern="[a-z0-9._\-]{3,40}"
                  title="3 a 40 letras minúsculas, números, puntos o guiones"
                  value={usuarioMostrado}
                  onChange={(e) => {
                    setUsuarioTocado(true);
                    setUsuario(e.target.value.toLowerCase());
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className={claseCampo}
                />
              </Campo>
              <Campo etiqueta="Contraseña inicial" htmlFor={`${id}-password`}>
                <span className="relative flex items-center">
                  <input
                    id={`${id}-password`}
                    name="password"
                    type={ver ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className={`${claseCampo} pr-16`}
                  />
                  <span className="absolute right-1.5 flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setVer((v) => !v)}
                      aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="grid size-6 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
                    >
                      {ver ? <EyeSlash className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPassword(generarPassword());
                        setVer(true);
                      }}
                      aria-label="Generar contraseña"
                      title="Generar contraseña"
                      className="grid size-6 place-items-center rounded text-tinta-2 hover:bg-placa-2 hover:text-tinta"
                    >
                      <ArrowsClockwise className="size-4" aria-hidden />
                    </button>
                  </span>
                </span>
                <span className="text-xs text-tinta-2">Mínimo 8 caracteres con letras y números. Entrégasela en persona.</span>
              </Campo>
            </div>
          )}
          <label htmlFor={`${id}-comercial`} className="flex items-center justify-between gap-3 border-t border-linea pt-3">
            <span>
              <span className="block text-sm font-medium text-tinta">Añadir también al equipo comercial</span>
              <span className="block text-xs text-tinta-2">Podrá ser responsable de empresas, oportunidades y tareas.</span>
            </span>
            <Switch id={`${id}-comercial`} checked={comercial} onCheckedChange={setComercial} />
          </label>
          <input type="hidden" name="equipo_comercial" value={comercial ? "si" : "no"} />
        </div>
      )}

      <Campo etiqueta="Notas internas" htmlFor={`${id}-notas`}>
        <textarea id={`${id}-notas`} name="notas" rows={3} defaultValue={inicial?.notas ?? ""} className={`${claseCampo} h-auto py-2`} />
      </Campo>

      {estado?.ok === false && (
        <p role="alert" className={claseError}>
          {estado.mensaje}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className="inline-flex h-9 items-center rounded-md border border-linea px-4 text-sm font-medium text-tinta hover:bg-placa-2">
          Cancelar
        </button>
        <Enviar texto={textoEnviar} pendienteTexto={textoPendiente} />
      </div>
    </div>
  );
}

/** Alta de empleado en un Dialog, como «Nuevo contacto». */
export function NuevoEmpleado({ directorio, sugerencias }: { directorio: EmpleadoMini[]; sugerencias: Sugerencias }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  const [estado, accion] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await guardarEmpleado(prev, fd);
    if (r.ok) {
      const id = r.id;
      toast.success(r.mensaje, id ? { action: { label: "Ver ficha", onClick: () => router.push(rutaRrhh.empleado(id)) } } : undefined);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        if (v) setVez((n) => n + 1);
      }}
    >
      <DialogTrigger asChild>
        <button type="button" className={`${claseBotonPrincipal} h-8 px-3`}>
          <Plus className="size-4" weight="bold" aria-hidden />
          Nuevo empleado
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-linea px-5 py-4">
          <DialogTitle>Nuevo empleado</DialogTitle>
          <DialogDescription>Ficha, permisos y cuenta del CRM. Su lista de incorporación se crea sola.</DialogDescription>
        </DialogHeader>
        <form action={accion} className="px-5 py-4">
          <CamposEmpleado
            key={vez}
            directorio={directorio}
            sugerencias={sugerencias}
            estado={estado}
            onCancelar={() => setAbierto(false)}
            textoEnviar="Dar de alta"
            textoPendiente="Dando de alta…"
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Edición de la ficha en un Sheet lateral, como «Editar contacto». */
export function EditarEmpleado({ empleado, directorio, sugerencias }: { empleado: Empleado; directorio: EmpleadoMini[]; sugerencias: Sugerencias }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [vez, setVez] = useState(0);
  const [estado, accion] = useActionState(async (prev: Resultado | null, fd: FormData) => {
    const r = await guardarEmpleado(prev, fd);
    if (r.ok) {
      toast.success(r.mensaje);
      setAbierto(false);
      router.refresh();
    }
    return r;
  }, null);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setVez((n) => n + 1);
          setAbierto(true);
        }}
        className={claseBotonSecundarioRrhh}
      >
        <PencilSimple className="size-4" aria-hidden /> Editar
      </button>
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent className="w-full gap-0 sm:max-w-lg">
          <SheetHeader className="border-b border-linea">
            <SheetTitle>Editar empleado</SheetTitle>
            <SheetDescription>{nombreEmpleado(empleado)}</SheetDescription>
          </SheetHeader>
          <form key={vez} action={accion} className="flex-1 overflow-y-auto p-4">
            <input type="hidden" name="id" value={empleado.id} />
            <CamposEmpleado
              inicial={empleado}
              directorio={directorio}
              sugerencias={sugerencias}
              estado={estado}
              onCancelar={() => setAbierto(false)}
              textoEnviar="Guardar cambios"
              textoPendiente="Guardando…"
            />
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
