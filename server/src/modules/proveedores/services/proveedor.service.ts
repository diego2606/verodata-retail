import { ApiFailure, ApiResponse } from '../../../shared/types/api.types';
import {
  CrearProveedorData,
  ProveedorRow,
  proveedorRepository,
} from '../repositories/proveedor.repository';
import { CrearProveedorInput, ListarProveedoresQuery } from '../schemas/proveedor.schemas';

function fallo(code: string, message: string, details: unknown = null): ApiFailure {
  return { success: false, error: { code, message, details } };
}

function limpiarTexto(valor: string | null | undefined): string | null {
  const t = valor?.trim();
  return t ? t : null;
}

export const proveedorService = {
  async listar(filtros: ListarProveedoresQuery): Promise<ApiResponse<ProveedorRow[]>> {
    const data = await proveedorRepository.listar(filtros.search);
    return { success: true, message: 'Proveedores obtenidos correctamente', data };
  },

  /** Alta de proveedor con validación de unicidad de la razón social. */
  async crear(input: CrearProveedorInput): Promise<ApiResponse<ProveedorRow>> {
    const nombre = input.nombre_empresa.trim();

    if (await proveedorRepository.existeNombre(nombre)) {
      return fallo(
        'PROVEEDOR_ALREADY_EXISTS',
        `Ya existe un proveedor con el nombre "${nombre}"`,
        { nombre_empresa: nombre }
      );
    }

    const data: CrearProveedorData = {
      nombre_empresa: nombre,
      contacto_nombre: limpiarTexto(input.contacto_nombre),
      telefono: limpiarTexto(input.telefono),
      email: limpiarTexto(input.email),
      categoria_productos: limpiarTexto(input.categoria_productos),
    };

    const creado = await proveedorRepository.crear(data);
    return { success: true, message: 'Proveedor creado correctamente', data: creado };
  },
};
