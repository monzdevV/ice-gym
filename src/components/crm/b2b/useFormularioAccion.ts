"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Envía un formulario a una server action sin que React lo vacíe.
 * Con `<form action={fn}>` React 19 resetea los campos no controlados al
 * terminar la acción, aunque devuelva un error, y el usuario pierde lo escrito.
 * Aquí se envía desde onSubmit (la validación nativa sigue funcionando).
 */
export function useFormularioAccion<R>(accion: (previo: R | null, fd: FormData) => Promise<R>) {
  const [estado, despachar, enCurso] = useActionState<R | null, FormData>((previo, fd) => accion(previo as R | null, fd), null);
  const [transicion, empezar] = useTransition();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    empezar(() => despachar(fd));
  }

  return { estado, onSubmit, pendiente: enCurso || transicion };
}
