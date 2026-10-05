import { redirect } from "next/navigation";

/** Este proyecto es sólo el CRM: la raíz lleva al panel. */
export default function Inicio() {
  redirect("/crm");
}
