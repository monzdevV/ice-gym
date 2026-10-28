import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, EnvelopeSimple, Phone, ShieldCheck, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import {
  directorio,
  gestionados,
  listarEvaluaciones,
  listarFichajes,
  listarNominas,
  listarTareasIncorporacion,
  listarVacaciones,
  obtenerEmpleado,
  perfilRrhh,
  sugerenciasEmpleado,
} from "@/lib/datos/rrhh";
import { antiguedad, duracion, horasDecimal, hoyMadrid, nombreEmpleado, progresoIncorporacion, rutaRrhh } from "@/lib/rrhh";
import { fecha } from "@/lib/formato";
import { Dato } from "@/components/crm/b2b/Piezas";
import { Seccion } from "@/components/crm/Primitivas";
import { CuentaEmpleado } from "@/components/crm/rrhh/CuentaEmpleado";
import { NuevaEvaluacion } from "@/components/crm/rrhh/Evaluaciones";
import { EditarEmpleado } from "@/components/crm/rrhh/FormularioEmpleado";
import { NuevoFichaje } from "@/components/crm/rrhh/Horarios";
import { NuevaTareaIncorporacion } from "@/components/crm/rrhh/Incorporacion";
import { ListaIncorporacion } from "@/components/crm/rrhh/ListaIncorporacion";
import { SubirNomina } from "@/components/crm/rrhh/Nominas";
import {
  AvatarEmpleado,
  BadgeRol,
  Cifras,
  EnlaceEmpleado,
  EstadoEmpleadoMarca,
  Progreso,
  claseBotonSecundarioRrhh,
  claseEnlaceSeccion,
} from "@/components/crm/rrhh/Piezas";
import { TablaEvaluaciones } from "@/components/crm/rrhh/TablaEvaluaciones";
import { TablaFichajes } from "@/components/crm/rrhh/TablasHorarios";
import { TablaNominas } from "@/components/crm/rrhh/TablaNominas";
import { TablaVacaciones, saldoVacaciones } from "@/components/crm/rrhh/TablaVacaciones";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = /^[0-9a-f-]{36}$/i.test(id) ? await obtenerEmpleado(id) : null;
  return { title: e ? nombreEmpleado(e) : "Empleado" };
}

function restarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

export default async function PaginaEmpleado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [perfil, empleado] = await Promise.all([perfilRrhh(), obtenerEmpleado(id)]);
  // Sin permiso, RLS no devuelve la fila: para quien no puede verla, no existe.
  if (!empleado || !perfil.empleado) notFound();

  const yo = perfil.empleado.id;
  const esYo = empleado.id === yo;
  const hoy = hoyMadrid();
  const anio = Number(hoy.slice(0, 4));
  const verNominas = esYo || perfil.esAdmin;

  const [dir, gestiona, tareas, fichajes, vacaciones, evaluaciones, nominas, sugerencias] = await Promise.all([
    directorio(),
    gestionados(),
    listarTareasIncorporacion({ empleadoId: id }),
    listarFichajes({ empleadoId: id, desde: restarDias(hoy, 45) }),
    listarVacaciones({ empleadoId: id }),
    listarEvaluaciones({ empleadoId: id }),
    verNominas ? listarNominas({ empleadoId: id }) : Promise.resolve([]),
    perfil.esAdmin ? sugerenciasEmpleado() : Promise.resolve({ departamentos: [], puestos: [] }),
  ]);
  const personas = new Map(dir.map((e) => [e.id, e]));
  const mini = personas.get(id);
  const persona = { ...empleado, foto_url: mini?.foto_url ?? null };
  const jefe = empleado.jefe_id ? personas.get(empleado.jefe_id) : null;
  const aCargo = dir.filter((e) => e.jefe_id === id);
  const activos = dir.filter((e) => e.estado === "activo");
  const gestionaEste = !esYo && gestiona(id);

  const progreso = progresoIncorporacion(tareas);
  const saldo = saldoVacaciones(vacaciones, empleado.dias_vacaciones, anio);
  const mes = hoy.slice(0, 7);
  const minutosMes = fichajes.filter((f) => f.fecha.startsWith(mes)).reduce((s, f) => s + (f.minutos ?? 0), 0);
  const ultima = evaluaciones[0];
  const nominasPendientes = nominas.filter((n) => !n.firmada_at);
  const telefono = empleado.telefono?.replace(/\s/g, "");

  return (
    <main className="px-4 pb-12 pt-5 lg:px-8">
      <nav aria-label="Migas" className="flex items-center gap-1.5 text-[0.8125rem] text-tinta-2">
        <Link href={rutaRrhh.empleados} className="inline-flex items-center gap-1.5 hover:text-tinta">
          <ArrowLeft className="size-4" aria-hidden />
          Empleados
        </Link>
        {empleado.departamento && (
          <>
            <span aria-hidden>/</span>
            <span className="truncate">{empleado.departamento}</span>
          </>
        )}
      </nav>

      {/* Cabecera */}
      <header className="mt-3 flex flex-col gap-4 border-b border-linea pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <AvatarEmpleado e={persona} tamano="lg" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-tinta">{nombreEmpleado(empleado)}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-sm text-tinta-2">
              <span>{empleado.puesto ?? "Sin puesto"}</span>
              {empleado.departamento && (
                <>
                  <span aria-hidden>—</span>
                  <span>{empleado.departamento}</span>
                </>
              )}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <EstadoEmpleadoMarca estado={empleado.estado} />
              <BadgeRol rol={empleado.rol} />
              {esYo && <span className="rounded bg-placa-2 px-1.5 text-[0.6875rem] font-medium text-tinta-2">Tú</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a href={`mailto:${empleado.email}`} className={claseBotonSecundarioRrhh}>
            <EnvelopeSimple className="size-4" aria-hidden /> Email
          </a>
          {telefono && (
            <a href={`tel:${telefono}`} className={claseBotonSecundarioRrhh}>
              <Phone className="size-4" aria-hidden /> Llamar
            </a>
          )}
          {perfil.esAdmin && <CuentaEmpleado empleado={empleado} />}
          {gestionaEste && empleado.estado === "activo" && <NuevaEvaluacion empleados={activos} empleadoId={id} />}
          {perfil.esAdmin && <EditarEmpleado empleado={empleado} directorio={dir} sugerencias={sugerencias} />}
        </div>
      </header>

      <div className="mt-5">
        <Cifras
          items={[
            { k: "Antigüedad", v: antiguedad(empleado.fecha_alta), detalle: `Alta ${fecha(empleado.fecha_alta)}` },
            { k: `Vacaciones disponibles ${anio}`, v: `${saldo.disponibles} días`, detalle: `${saldo.aprobados} aprobados · ${saldo.pendientes} pendientes` },
            { k: "Horas este mes", v: horasDecimal(minutosMes) },
            {
              k: "Última evaluación",
              v: ultima ? `${ultima.puntuacion}/5` : "—",
              detalle: ultima ? `Q${ultima.trimestre} ${ultima.anio}` : "Sin evaluar",
            },
          ]}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Columna principal */}
        <div className="flex min-w-0 flex-col gap-5">
          {esYo && nominasPendientes.length > 0 && (
            <section aria-labelledby="nominas-pendientes" className="rounded-xl border border-aviso/40 bg-aviso/[0.07] px-4 py-3.5">
              <h2 id="nominas-pendientes" className="flex items-center gap-2 text-sm font-semibold text-tinta">
                <WarningCircle className="size-4 text-aviso" weight="fill" aria-hidden />
                Tienes {nominasPendientes.length === 1 ? "una nómina" : `${nominasPendientes.length} nóminas`} sin firmar
              </h2>
              <p className="mt-1 text-[0.8125rem] text-tinta-2">Ábrela en la sección Nóminas de abajo y firma su recepción.</p>
            </section>
          )}

          <div id="incorporacion" className="scroll-mt-20">
            <Seccion
              titulo="Incorporación"
              extra={
                <span className="flex items-center gap-3">
                  {tareas.length > 0 && (
                    <span className="w-36">
                      <Progreso pct={progreso.pct} completado={progreso.completada} texto={progreso.completada ? "Completada" : `${progreso.hechas}/${progreso.obligatorias}`} />
                    </span>
                  )}
                  {perfil.esAdmin && <NuevaTareaIncorporacion empleadoId={id} responsables={activos} />}
                </span>
              }
            >
              {tareas.length === 0 ? (
                <p className="py-2 text-sm text-tinta-2">No tiene tareas de incorporación.</p>
              ) : (
                <ListaIncorporacion tareas={tareas} personas={personas} yoId={yo} esAdmin={perfil.esAdmin} gestionaEmpleado={gestiona} responsables={activos} />
              )}
            </Seccion>
          </div>

          <Seccion
            titulo="Horarios · últimos 45 días"
            id="horarios"
            extra={
              <span className="flex items-center gap-3">
                {perfil.esAdmin && <NuevoFichaje empleados={activos} empleadoId={id} />}
                <Link href={`${rutaRrhh.horarios}${esYo ? "" : `?empleado=${id}`}`} className={claseEnlaceSeccion}>
                  Ver todo <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </span>
            }
          >
            {fichajes.length === 0 ? (
              <p className="py-2 text-sm text-tinta-2">Sin registros de entrada y salida en este periodo.</p>
            ) : (
              <TablaFichajes
                fichajes={fichajes.slice(0, 15)}
                personas={personas}
                conEmpleado={false}
                editable={perfil.esAdmin}
                empleados={activos}
                enSeccion
                hoy={hoy}
              />
            )}
          </Seccion>

          <Seccion
            titulo="Vacaciones"
            id="vacaciones"
            extra={<span className="text-xs tabular-nums text-tinta-2">{saldo.disponibles} de {saldo.asignados} días disponibles</span>}
          >
            {vacaciones.length === 0 ? (
              <p className="py-2 text-sm text-tinta-2">No ha solicitado vacaciones.</p>
            ) : (
              <TablaVacaciones lista={vacaciones} personas={personas} yoId={yo} esGestor={perfil.esGestor} conEmpleado={false} enSeccion />
            )}
          </Seccion>

          <Seccion
            titulo="Evaluaciones trimestrales"
            id="evaluaciones"
            extra={gestionaEste && empleado.estado === "activo" ? <NuevaEvaluacion empleados={activos} empleadoId={id} enlace /> : undefined}
          >
            {evaluaciones.length === 0 ? (
              <p className="py-2 text-sm text-tinta-2">{esYo ? "Aún no tienes evaluaciones visibles." : "Aún no tiene evaluaciones."}</p>
            ) : (
              <TablaEvaluaciones
                lista={evaluaciones}
                personas={personas}
                yoId={yo}
                esAdmin={perfil.esAdmin}
                gestionaEmpleado={gestiona}
                empleados={activos}
                conEmpleado={false}
                enSeccion
              />
            )}
          </Seccion>

          {verNominas && (
            <Seccion titulo="Nóminas" id="nominas" extra={perfil.esAdmin ? <SubirNomina empleados={activos} empleadoId={id} enlace /> : undefined}>
              {nominas.length === 0 ? (
                <p className="py-2 text-sm text-tinta-2">No hay nóminas subidas.</p>
              ) : (
                <TablaNominas lista={nominas} personas={personas} yoId={yo} esAdmin={perfil.esAdmin} conEmpleado={false} enSeccion />
              )}
            </Seccion>
          )}
        </div>

        {/* Lateral */}
        <div className="flex min-w-0 flex-col gap-5">
          <Seccion titulo="Datos del empleado" id="datos">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5">
              <Dato etiqueta="Nombre">{empleado.nombre}</Dato>
              <Dato etiqueta="Apellidos">{empleado.apellidos || null}</Dato>
              <Dato etiqueta="DNI / NIE">{empleado.documento ? <span className="font-mono">{empleado.documento}</span> : null}</Dato>
              <Dato etiqueta="Nacimiento">{empleado.fecha_nacimiento ? fecha(empleado.fecha_nacimiento) : null}</Dato>
              <div className="col-span-2">
                <Dato etiqueta="Email">
                  <a href={`mailto:${empleado.email}`} className="break-all hover:underline">
                    {empleado.email}
                  </a>
                </Dato>
              </div>
              <Dato etiqueta="Teléfono">
                {telefono ? (
                  <a href={`tel:${telefono}`} className="tabular-nums hover:underline">
                    {empleado.telefono}
                  </a>
                ) : null}
              </Dato>
              <Dato etiqueta="Responsable">{jefe ? <EnlaceEmpleado e={jefe} /> : null}</Dato>
              <Dato etiqueta="Puesto">{empleado.puesto}</Dato>
              <Dato etiqueta="Departamento">{empleado.departamento}</Dato>
              <Dato etiqueta="Fecha de alta">{fecha(empleado.fecha_alta)}</Dato>
              <Dato etiqueta="Fecha de baja">{empleado.fecha_baja ? fecha(empleado.fecha_baja) : null}</Dato>
              <div className="col-span-2">
                <Dato etiqueta="Dirección">{empleado.direccion}</Dato>
              </div>
              <div className="col-span-2">
                <Dato etiqueta="Contacto de emergencia">{empleado.contacto_emergencia}</Dato>
              </div>
              {empleado.notas && (
                <div className="col-span-2">
                  <Dato etiqueta="Notas">
                    <span className="whitespace-pre-line">{empleado.notas}</span>
                  </Dato>
                </div>
              )}
            </dl>
          </Seccion>

          <Seccion titulo="Cuenta del CRM" id="cuenta">
            {empleado.user_id ? (
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-placa-2 text-tinta-2">
                  <ShieldCheck className="size-5" weight="fill" aria-hidden />
                </span>
                <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3">
                  <Dato etiqueta="Usuario">{empleado.usuario ? <span className="font-mono">{empleado.usuario}</span> : null}</Dato>
                  <Dato etiqueta="Rol">
                    <BadgeRol rol={empleado.rol} />
                  </Dato>
                  <div className="col-span-2">
                    <Dato etiqueta="Acceso">{empleado.estado === "activo" ? "Puede entrar con su usuario o su email." : "Bloqueado: el empleado está de baja."}</Dato>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-tinta-2">
                Sin cuenta: no puede entrar al CRM.
                {perfil.esAdmin && " Créala con «Crear cuenta» en la cabecera."}
              </p>
            )}
          </Seccion>

          {aCargo.length > 0 && (
            <Seccion titulo="Equipo a cargo" id="equipo" extra={<span className="text-xs tabular-nums text-tinta-2">{aCargo.length}</span>}>
              <ul className="flex flex-col gap-2.5">
                {aCargo.map((e) => (
                  <li key={e.id} className={e.estado === "inactivo" ? "opacity-60" : ""}>
                    <EnlaceEmpleado e={e} detalle={e.puesto} />
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          {fichajes.length > 0 && (
            <p className="px-1 text-xs text-tinta-2">
              Media por jornada en los últimos 45 días:{" "}
              <span className="font-medium tabular-nums text-tinta">
                {duracion(Math.round(fichajes.reduce((s, f) => s + (f.minutos ?? 0), 0) / Math.max(1, new Set(fichajes.map((f) => f.fecha)).size)))}
              </span>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
