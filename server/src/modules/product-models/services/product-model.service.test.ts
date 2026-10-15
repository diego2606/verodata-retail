import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/product-model.repository', () => ({
  productModelRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    listarVariantes: vi.fn(),
    obtenerModeloIdPorSku: vi.fn(),
    existeSku: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    aplicarDelta: vi.fn(),
  },
}));

vi.mock('../../categories/repositories/category.repository', () => ({
  categoryRepository: {
    obtenerPorId: vi.fn(),
    obtenerCadenaAtributos: vi.fn(),
    obtenerPlantillaSku: vi.fn(),
  },
}));

vi.mock('../../products/repositories/product.repository', () => ({
  productRepository: {
    listarImagenes: vi.fn(),
    crearImagen: vi.fn(),
    marcarImagenPrincipal: vi.fn(),
    obtenerImagen: vi.fn(),
    actualizarImagen: vi.fn(),
    eliminarImagen: vi.fn(),
  },
}));

vi.mock('../../../shared/utils/imagenUpload', () => ({
  resolverUrlImagen: vi.fn(),
}));

import { mapearErrorUnicidad, productModelService } from './product-model.service';
import { productModelRepository } from '../repositories/product-model.repository';
import type { ProductoModeloRow, SkuVarianteRow } from '../repositories/product-model.repository';
import { categoryRepository } from '../../categories/repositories/category.repository';
import { productRepository } from '../../products/repositories/product.repository';
import { resolverUrlImagen } from '../../../shared/utils/imagenUpload';
import {
  AtributoFaltanteError,
  AtributoInvalidoError,
  VarianteDuplicadaError,
} from './product-model.errors';

const repo = productModelRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  obtenerPorId: ReturnType<typeof vi.fn>;
  listarVariantes: ReturnType<typeof vi.fn>;
  obtenerModeloIdPorSku: ReturnType<typeof vi.fn>;
  existeSku: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
  aplicarDelta: ReturnType<typeof vi.fn>;
};

const catRepo = categoryRepository as unknown as {
  obtenerPorId: ReturnType<typeof vi.fn>;
  obtenerCadenaAtributos: ReturnType<typeof vi.fn>;
  obtenerPlantillaSku: ReturnType<typeof vi.fn>;
};

const MODELO_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SKU_ID = '11111111-1111-1111-1111-111111111111';

const modelo: ProductoModeloRow = {
  id: MODELO_ID,
  categoria_id: 1,
  categoria_nombre: 'Zapatillas',
  nombre: 'Runner Pro',
  marca: 'Nike',
  modelo_codigo: 'RNP',
  descripcion: 'Zapatilla de running',
  atributos_variantes: ['COLOR', 'SIZE'],
  activo: true,
  destacado: false,
  destacado_orden: null,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

const varianteExistente: SkuVarianteRow = {
  id: SKU_ID,
  sku: 'ZAP-NEG-41',
  codigo_barras: null,
  atributos: { COLOR: 'Negro', SIZE: '41' },
  precio_regular: 100,
  precio_oferta: null,
  activo: true,
  stock_actual: 3,
  stock_minimo: 5,
};

function deltaBase(overrides: Record<string, unknown> = {}): Parameters<typeof productModelService.aplicarDelta>[1] {
  return {
    nuevas_variantes: [],
    actualizar_variantes: [],
    eliminar_variantes: [],
    ...overrides,
  } as Parameters<typeof productModelService.aplicarDelta>[1];
}

beforeEach(() => {
  vi.clearAllMocks();
  catRepo.obtenerPorId.mockResolvedValue({ id: 1, nombre: 'Zapatillas' });
  catRepo.obtenerCadenaAtributos.mockResolvedValue({
    nombre: 'Zapatillas',
    cadenas: [['COLOR', 'SIZE']],
    cadenasValores: [null],
  });
  catRepo.obtenerPlantillaSku.mockResolvedValue({
    sku_prefijo: 'ZAP',
    sku_segmentos: ['CATEGORIA', 'COLOR', 'SIZE'],
  });
  repo.obtenerPorId.mockResolvedValue(modelo);
  repo.listarVariantes.mockResolvedValue([varianteExistente]);
  repo.existeSku.mockResolvedValue(false);
  repo.aplicarDelta.mockResolvedValue({ creadas: 1, actualizadas: 0, desactivadas: 0 });
});

describe('productModelService.crear (HU035)', () => {
  it('rechaza ejes que no pertenecen a la categoría', async () => {
    const result = await productModelService.crear({
      categoria_id: 1,
      nombre: 'Runner Pro',
      atributos_variantes: ['COLOR', 'RAM'],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('INVALID_ATTRIBUTE');
      expect(result.error.details).toMatchObject({ atributos: ['RAM'] });
    }
  });

  it('crea el modelo con los ejes permitidos', async () => {
    repo.crear.mockResolvedValue(MODELO_ID);
    const result = await productModelService.crear({
      categoria_id: 1,
      nombre: 'Runner Pro',
      marca: '  Nike  ',
      atributos_variantes: ['COLOR', 'SIZE'],
    });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ marca: 'Nike', atributos_variantes: ['COLOR', 'SIZE'] })
    );
  });

  it('devuelve CATEGORY_NOT_FOUND si la categoría no existe', async () => {
    catRepo.obtenerPorId.mockResolvedValue(null);
    const result = await productModelService.crear({ categoria_id: 99, nombre: 'X' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('productModelService.aplicarDelta (HU035 CA08)', () => {
  it('devuelve MODEL_NOT_FOUND si el modelo no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await productModelService.aplicarDelta(MODELO_ID, deltaBase());
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('MODEL_NOT_FOUND');
  });

  it('genera el SKU por plantilla y normaliza los atributos de la variante nueva', async () => {
    repo.listarVariantes.mockResolvedValue([]);
    const result = await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        nuevas_variantes: [
          {
            atributos: { COLOR: 'negro', SIZE: '42' },
            precio_regular: 89.99,
            stock_actual: 10,
          },
        ],
      })
    );

    expect(result.success).toBe(true);
    const delta = repo.aplicarDelta.mock.calls[0][1];
    expect(delta.nuevas[0]).toMatchObject({
      sku: 'ZAP-NEG-42',
      atributos: { COLOR: 'Negro', SIZE: '42' },
      stock_actual: 10,
      stock_minimo: 5,
    });
  });

  it('respetando el SKU manual cuando la categoría no tiene plantilla', async () => {
    catRepo.obtenerPlantillaSku.mockResolvedValue({ sku_prefijo: null, sku_segmentos: null });
    repo.listarVariantes.mockResolvedValue([]);
    const result = await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        nuevas_variantes: [
          {
            atributos: { COLOR: 'Blanco', SIZE: '43' },
            sku: '  zap-bla-43  ',
            precio_regular: 90,
            stock_actual: 1,
          },
        ],
      })
    );
    expect(result.success).toBe(true);
    expect(repo.aplicarDelta.mock.calls[0][1].nuevas[0].sku).toBe('ZAP-BLA-43');
  });

  it('rechaza variantes con ejes faltantes', async () => {
    await expect(
      productModelService.aplicarDelta(
        MODELO_ID,
        deltaBase({ nuevas_variantes: [{ atributos: { COLOR: 'Negro' }, precio_regular: 90, stock_actual: 1 }] })
      )
    ).rejects.toBeInstanceOf(AtributoFaltanteError);
  });

  it('rechaza atributos que no son ejes del modelo', async () => {
    await expect(
      productModelService.aplicarDelta(
        MODELO_ID,
        deltaBase({
          nuevas_variantes: [
            { atributos: { COLOR: 'Negro', SIZE: '42', CAPACITY: '1 L' }, precio_regular: 90, stock_actual: 1 },
          ],
        })
      )
    ).rejects.toBeInstanceOf(AtributoInvalidoError);
  });

  it('rechaza una combinación duplicada dentro del mismo payload', async () => {
    repo.listarVariantes.mockResolvedValue([]);
    await expect(
      productModelService.aplicarDelta(
        MODELO_ID,
        deltaBase({
          nuevas_variantes: [
            { atributos: { COLOR: 'Negro', SIZE: '42' }, precio_regular: 90, stock_actual: 1 },
            { atributos: { COLOR: 'negro', SIZE: '42' }, precio_regular: 91, stock_actual: 2 },
          ],
        })
      )
    ).rejects.toBeInstanceOf(VarianteDuplicadaError);
  });

  it('rechaza una combinación que ya existe en la base de datos', async () => {
    await expect(
      productModelService.aplicarDelta(
        MODELO_ID,
        deltaBase({
          nuevas_variantes: [{ atributos: { COLOR: 'Negro', SIZE: '41' }, precio_regular: 90, stock_actual: 1 }],
        })
      )
    ).rejects.toBeInstanceOf(VarianteDuplicadaError);
  });

  it('rechaza un SKU ya registrado', async () => {
    catRepo.obtenerPlantillaSku.mockResolvedValue({ sku_prefijo: null, sku_segmentos: null });
    repo.listarVariantes.mockResolvedValue([]);
    repo.existeSku.mockResolvedValue(true);
    const result = await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        nuevas_variantes: [
          { atributos: { COLOR: 'Verde', SIZE: '44' }, sku: 'ZAP-VER-44', precio_regular: 90, stock_actual: 1 },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_ALREADY_EXISTS');
  });

  it('valida que la variante a actualizar pertenezca al modelo', async () => {
    const result = await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        actualizar_variantes: [
          { sku_id: '22222222-2222-2222-2222-222222222222', precio_regular: 95 },
        ],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VARIANT_NOT_FOUND');
  });

  it('marca reemplazaOferta solo cuando el payload define precio_oferta', async () => {
    await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        actualizar_variantes: [
          { sku_id: SKU_ID, precio_regular: 95 },
          { sku_id: SKU_ID, precio_oferta: null, stock_actual: 5 },
        ],
      })
    );
    const enviado = repo.aplicarDelta.mock.calls[0][1];
    expect(enviado.actualizar[0]).toMatchObject({ reemplazaOferta: false, precio_oferta: null });
    expect(enviado.actualizar[1]).toMatchObject({ reemplazaOferta: true, precio_oferta: null });
  });

  it('traduce la violación de unicidad de combinación a VARIANT_ALREADY_EXISTS', async () => {
    repo.listarVariantes.mockResolvedValue([]);
    repo.aplicarDelta.mockRejectedValue({ code: '23505', constraint: 'uq_productos_modelo_combinacion' });
    const result = await productModelService.aplicarDelta(
      MODELO_ID,
      deltaBase({
        nuevas_variantes: [{ atributos: { COLOR: 'Negro', SIZE: '42' }, precio_regular: 90, stock_actual: 1 }],
      })
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VARIANT_ALREADY_EXISTS');
  });

  it('desactiva (borrado lógico) las variantes indicadas', async () => {
    await productModelService.aplicarDelta(MODELO_ID, deltaBase({ eliminar_variantes: [SKU_ID] }));
    expect(repo.aplicarDelta.mock.calls[0][1].eliminar).toEqual([SKU_ID]);
  });
});

describe('productModelService.obtenerPorSku (HU035)', () => {
  it('devuelve MODEL_NOT_FOUND si el SKU no tiene modelo', async () => {
    repo.obtenerModeloIdPorSku.mockResolvedValue(undefined);
    const result = await productModelService.obtenerPorSku(SKU_ID);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('MODEL_NOT_FOUND');
  });

  it('resuelve el modelo y sus variantes desde el SKU', async () => {
    repo.obtenerModeloIdPorSku.mockResolvedValue(MODELO_ID);
    const result = await productModelService.obtenerPorSku(SKU_ID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(MODELO_ID);
      expect(result.data.variantes).toEqual([varianteExistente]);
    }
  });
});

describe('productModelService galería (HU033/HU035)', () => {
  const imgRepo = productRepository as unknown as {
    listarImagenes: ReturnType<typeof vi.fn>;
    crearImagen: ReturnType<typeof vi.fn>;
    marcarImagenPrincipal: ReturnType<typeof vi.fn>;
    obtenerImagen: ReturnType<typeof vi.fn>;
    actualizarImagen: ReturnType<typeof vi.fn>;
    eliminarImagen: ReturnType<typeof vi.fn>;
  };
  const subir = resolverUrlImagen as unknown as ReturnType<typeof vi.fn>;

  it('lista las imágenes del modelo con el ámbito correcto', async () => {
    imgRepo.listarImagenes.mockResolvedValue([]);
    const result = await productModelService.listarImagenes(MODELO_ID);
    expect(result.success).toBe(true);
    expect(imgRepo.listarImagenes).toHaveBeenCalledWith({ columna: 'modelo_id', id: MODELO_ID });
  });

  it('agrega una imagen por URL usando el ámbito modelo', async () => {
    subir.mockResolvedValue({ url: 'https://img/1.png' });
    imgRepo.crearImagen.mockResolvedValue({ id: 'img-1' });
    const result = await productModelService.agregarImagen(MODELO_ID, { url: 'https://img/1.png' });
    expect(result.success).toBe(true);
    expect(imgRepo.crearImagen).toHaveBeenCalledWith(
      { columna: 'modelo_id', id: MODELO_ID },
      { url: 'https://img/1.png', alt: null, esPrincipal: false }
    );
  });

  it('propaga el error de subida de la imagen', async () => {
    subir.mockResolvedValue({ error: 'STORAGE_NOT_CONFIGURED', message: 'No configurado' });
    const result = await productModelService.agregarImagen(MODELO_ID, {
      data: 'data:image/png;base64,AA',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('STORAGE_NOT_CONFIGURED');
  });

  it('marca una imagen como principal del modelo', async () => {
    imgRepo.marcarImagenPrincipal.mockResolvedValue(true);
    const result = await productModelService.marcarImagenPrincipal(MODELO_ID, 'img-1');
    expect(result.success).toBe(true);
    expect(imgRepo.marcarImagenPrincipal).toHaveBeenCalledWith(
      { columna: 'modelo_id', id: MODELO_ID },
      'img-1'
    );
  });

  it('elimina una imagen del modelo', async () => {
    imgRepo.eliminarImagen.mockResolvedValue(true);
    const result = await productModelService.eliminarImagen(MODELO_ID, 'img-1');
    expect(result.success).toBe(true);
  });
});

describe('mapearErrorUnicidad', () => {
  it('mapea código de barras y SKU', () => {
    expect(mapearErrorUnicidad({ code: '23505', constraint: 'uq_productos_codigo_barras' }).error.code).toBe(
      'BARCODE_ALREADY_EXISTS'
    );
    expect(mapearErrorUnicidad({ code: '23505', constraint: 'productos_sku_key' }).error.code).toBe(
      'SKU_ALREADY_EXISTS'
    );
  });

  it('re-lanza errores que no son de unicidad', () => {
    expect(() => mapearErrorUnicidad(new Error('otro'))).toThrow('otro');
  });
});
