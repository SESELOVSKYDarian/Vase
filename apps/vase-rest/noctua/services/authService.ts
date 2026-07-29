export async function crearAuthUsuario(data: {
  email: string;
  password: string;
}): Promise<{ id: string; email: string }> {
  const response = await fetch('/api/admin/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accion: 'crear',
      email: data.email,
      password: data.password,
    }),
  });

  const resultado = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      resultado.error ??
        'No se pudo crear el usuario en Supabase Auth.'
    );
  }

  if (!resultado.id) {
    throw new Error(
      'Supabase Auth no devolvió el identificador del usuario.'
    );
  }

  return {
    id: resultado.id,
    email: resultado.email ?? data.email,
  };
}

export async function actualizarAuthUsuario(
  authUserId: string,
  cambios: {
    email?: string;
    password?: string;
  }
): Promise<void> {
  const response = await fetch('/api/admin/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accion: 'actualizar',
      authUserId,
      ...cambios,
    }),
  });

  const resultado = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      resultado.error ??
        'No se pudo actualizar el usuario de Supabase Auth.'
    );
  }
}

export async function eliminarAuthUsuario(
  authUserId: string
): Promise<void> {
  const response = await fetch('/api/admin/usuarios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      accion: 'eliminar',
      authUserId,
    }),
  });

  const resultado = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      resultado.error ??
        'No se pudo eliminar el usuario de Supabase Auth.'
    );
  }
}