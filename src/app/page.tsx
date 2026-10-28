import { datosLanding } from "@/lib/datos/publico";
import { ScrollSuave } from "@/components/landing/ScrollSuave";
import { Cabecera } from "@/components/landing/Cabecera";
import { Portada } from "@/components/landing/Portada";
import { Manifiesto } from "@/components/landing/Manifiesto";
import { Instalaciones } from "@/components/landing/Instalaciones";
import { Cifras } from "@/components/landing/Cifras";
import { Tarifas } from "@/components/landing/Tarifas";
import { Centros } from "@/components/landing/Centros";
import { Clases } from "@/components/landing/Clases";
import { Visita } from "@/components/landing/Visita";
import { Pie } from "@/components/landing/Pie";

export default async function Inicio() {
  const datos = await datosLanding();

  return (
    <ScrollSuave>
      <div className="landing ruido min-h-dvh bg-fondo text-tinta">
        <a
          href="#contenido"
          className="condensada sr-only z-[60] bg-acento px-5 py-3 text-base tracking-[0.1em] text-sobre-campo focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>
        <Cabecera datos={datos} />
        <main id="contenido" tabIndex={-1} className="outline-none">
          <Portada datos={datos} />
          <Manifiesto />
          <Instalaciones />
          <Cifras datos={datos} />
          <Tarifas datos={datos} />
          <Centros datos={datos} />
          <Clases datos={datos} />
          <Visita datos={datos} />
        </main>
        <Pie datos={datos} />
      </div>
    </ScrollSuave>
  );
}
