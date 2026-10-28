import { redirect } from "next/navigation";
import { rutaRrhh } from "@/lib/rrhh";

/** /crm/rrhh lleva a Empleados. */
export default function Rrhh() {
  redirect(rutaRrhh.empleados);
}
