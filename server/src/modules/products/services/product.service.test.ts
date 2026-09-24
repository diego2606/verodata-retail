import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../repositories/product.repository', () => ({
  productRepository: {
    listar: vi.fn(),
    obtenerPorId: vi.fn(),
    existeSku: vi.fn(),
    existeVariante: vi.fn(),
    existeCategoria: vi.fn(),
    crear: vi.fn(),
    crearLote: vi.fn(),
    actualizar: vi.fn(),
  },
}));

vi.mock('../../categories/repositories/category.repository', () => ({
  categoryRepository: {
    obtenerCadenaAtributos: vi.fn(),
    obtenerPlantillaSku: vi.fn(),
  },
}));

import { productService, normalizarValorAtributo } from './product.service';
import { productRepository } from '../repositories/product.repository';
import { categoryRepository } from '../../categories/repositories/category.repository';
import type { ProductoRow } from '../repositories/product.repository';

const TODOS_LOS_ATRIBUTOS = [
  'COLOR',
  'SIZE',
  'CAPACITY',
  'STORAGE_CAPACITY',
  'MODEL',
  'GENDER',
  'LINE',
  'BRAND',
];

const repo = productRepository as unknown as {
  listar: ReturnType<typeof vi.fn>;
  obtenerPorId: ReturnType<typeof vi.fn>;
  existeSku: ReturnType<typeof vi.fn>;
  existeVariante: ReturnType<typeof vi.fn>;
  existeCategoria: ReturnType<typeof vi.fn>;
  crear: ReturnType<typeof vi.fn>;
  crearLote: ReturnType<typeof vi.fn>;
  actualizar: ReturnType<typeof vi.fn>;
};

const catRepo = categoryRepository as unknown as {
  obtenerCadenaAtributos: ReturnType<typeof vi.fn>;
  obtenerPlantillaSku: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  catRepo.obtenerCadenaAtributos.mockResolvedValue({
    nombre: 'Calzado',
    cadenas: [TODOS_LOS_ATRIBUTOS],
  });
  catRepo.obtenerPlantillaSku.mockResolvedValue({ sku_prefijo: null, sku_segmentos: null });
});

const row: ProductoRow = {
  id: 'p1',
  categoria_id: 1,
  categoria_nombre: 'Calzado',
  sku: 'SKU-1',
  nombre: 'Zapatilla',
  descripcion: 'Descripción',
  precio_regular: 100,
  precio_oferta: null,
  imagen_url: null,
  modelo: null,
  atributos: {},
  activo: true,
  stock_actual: 0,
  stock_minimo: 5,
  creado_en: new Date(),
  actualizado_en: new Date(),
};

const input = {
  categoria_id: 1,
  sku: 'sku-1',
  nombre: 'Zapatilla',
  descripcion: 'Descripción',
  precio_regular: 100,
};

describe('productService.crear (HU007)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeSku.mockResolvedValue(false);
    repo.existeVariante.mockResolvedValue(false);
    repo.existeCategoria.mockResolvedValue(true);
    repo.crear.mockResolvedValue('p1');
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('normaliza el SKU a mayúsculas y crea el producto', async () => {
    const result = await productService.crear(input);
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'SKU-1',
        precio_oferta: null,
        imagen_url: null,
        stock_inicial: 0,
        stock_minimo: 5,
      })
    );
  });

  it('normaliza modelo y atributos de variante', async () => {
    const result = await productService.crear({
      ...input,
      modelo: '  Nike Air Force 1  ',
      atributos: { COLOR: 'Negro', SIZE: '42', CAPACITY: '  ' },
    });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        modelo: 'Nike Air Force 1',
        atributos: { COLOR: 'Negro', SIZE: '42' },
      })
    );
  });

  it('rechaza variante duplicada con VARIANT_ALREADY_EXISTS', async () => {
    repo.existeVariante.mockResolvedValue(true);
    const result = await productService.crear({ ...input, modelo: 'Modelo X' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('VARIANT_ALREADY_EXISTS');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza SKU duplicado con SKU_ALREADY_EXISTS', async () => {
    repo.existeSku.mockResolvedValue(true);
    const result = await productService.crear(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_ALREADY_EXISTS');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza categoría inexistente con CATEGORY_NOT_FOUND', async () => {
    catRepo.obtenerCadenaAtributos.mockResolvedValue(null);
    const result = await productService.crear(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('productService.listar (HU007)', () => {
  it('devuelve el listado de productos', async () => {
    repo.listar.mockResolvedValue([row]);
    const result = await productService.listar({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(1);
  });
});

describe('productService.actualizar (HU008)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.obtenerPorId.mockResolvedValue(row);
    repo.existeVariante.mockResolvedValue(false);
    repo.existeCategoria.mockResolvedValue(true);
    repo.actualizar.mockResolvedValue(undefined);
  });

  it('devuelve RESOURCE_NOT_FOUND si el producto no existe', async () => {
    repo.obtenerPorId.mockResolvedValue(null);
    const result = await productService.actualizar('p-x', { nombre: 'Nuevo' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('rechaza oferta >= regular con INVALID_PRICE (valores resultantes)', async () => {
    repo.obtenerPorId.mockResolvedValue({ ...row, precio_oferta: 90 });
    const result = await productService.actualizar('p1', { precio_regular: 80 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_PRICE');
    expect(repo.actualizar).not.toHaveBeenCalled();
  });

  it('actualiza y devuelve el producto', async () => {
    const result = await productService.actualizar('p1', { nombre: 'Zapatilla Pro' });
    expect(result.success).toBe(true);
    expect(repo.actualizar).toHaveBeenCalledOnce();
  });
});

describe('productService.actualizar (HU009)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.obtenerPorId.mockResolvedValue(row);
    repo.actualizar.mockResolvedValue(undefined);
  });

  it('aplica el borrado lógico con activo = false', async () => {
    repo.obtenerPorId
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce({ ...row, activo: false });
    const result = await productService.actualizar('p1', { activo: false });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.activo).toBe(false);
    expect(repo.actualizar).toHaveBeenCalledWith('p1', expect.objectContaining({ activo: false }));
  });
});

describe('normalizarValorAtributo (HU026)', () => {
  it('recorta, colapsa espacios y capitaliza', () => {
    expect(normalizarValorAtributo('  negro ')).toBe('Negro');
    expect(normalizarValorAtributo('NEGRO')).toBe('Negro');
    expect(normalizarValorAtributo('128   gb')).toBe('128 Gb');
  });
});

describe('productService.crear (HU024)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeSku.mockResolvedValue(false);
    repo.existeCategoria.mockResolvedValue(true);
    repo.existeVariante.mockResolvedValue(false);
    repo.crear.mockResolvedValue('p1');
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('usa stock inicial y mínimo provistos', async () => {
    const result = await productService.crear({ ...input, stock_inicial: 25, stock_minimo: 10 });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ stock_inicial: 25, stock_minimo: 10 })
    );
  });

  it('normaliza los valores de atributos al persistir', async () => {
    const result = await productService.crear({
      ...input,
      modelo: 'Zapatilla',
      atributos: { COLOR: 'negro', SIZE: 'm' },
    });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ atributos: { COLOR: 'Negro', SIZE: 'M' } })
    );
  });
});

describe('productService.crearLote (HU028)', () => {
  const variante = (sku: string) => ({ ...input, sku });

  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeSku.mockResolvedValue(false);
    repo.existeCategoria.mockResolvedValue(true);
    repo.existeVariante.mockResolvedValue(false);
    repo.crearLote.mockResolvedValue(['p1', 'p2']);
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('crea el lote completo de forma transaccional', async () => {
    const result = await productService.crearLote({ productos: [variante('A-1'), variante('A-2')] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toHaveLength(2);
    expect(repo.crearLote).toHaveBeenCalledOnce();
  });

  it('rechaza SKUs repetidos dentro del lote sin persistir', async () => {
    const result = await productService.crearLote({ productos: [variante('A-1'), variante('A-1')] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_ALREADY_EXISTS');
    expect(repo.crearLote).not.toHaveBeenCalled();
  });

  it('rechaza si un SKU ya existe', async () => {
    repo.existeSku.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const result = await productService.crearLote({ productos: [variante('A-1'), variante('A-2')] });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_ALREADY_EXISTS');
    expect(repo.crearLote).not.toHaveBeenCalled();
  });
});

describe('productService validación de atributos por categoría (HU029)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catRepo.obtenerCadenaAtributos.mockResolvedValue({
      nombre: 'Calzado',
      cadenas: [['COLOR', 'SIZE']],
    });
    repo.existeSku.mockResolvedValue(false);
    repo.existeVariante.mockResolvedValue(false);
    repo.crear.mockResolvedValue('p1');
    repo.obtenerPorId.mockResolvedValue(row);
  });

  it('rechaza un atributo no permitido con INVALID_ATTRIBUTE', async () => {
    const result = await productService.crear({
      ...input,
      modelo: 'Modelo X',
      atributos: { CAPACITY: '1 L' },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('INVALID_ATTRIBUTE');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('acepta los atributos permitidos por la categoría', async () => {
    const result = await productService.crear({
      ...input,
      modelo: 'Modelo X',
      atributos: { COLOR: 'Negro' },
    });
    expect(result.success).toBe(true);
  });

  it('devuelve CATEGORY_NOT_FOUND si la categoría no existe', async () => {
    catRepo.obtenerCadenaAtributos.mockResolvedValue(null);
    const result = await productService.crear(input);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('CATEGORY_NOT_FOUND');
  });
});

describe('productService.crear (HU031 SKU estructurado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repo.existeSku.mockResolvedValue(false);
    repo.existeVariante.mockResolvedValue(false);
    repo.crear.mockResolvedValue('p1');
    repo.obtenerPorId.mockResolvedValue(row);
    catRepo.obtenerCadenaAtributos.mockResolvedValue({
      nombre: 'Tecnología',
      cadenas: [TODOS_LOS_ATRIBUTOS],
    });
  });

  it('genera el SKU desde la plantilla de la categoría', async () => {
    catRepo.obtenerPlantillaSku.mockResolvedValue({
      sku_prefijo: 'TEC',
      sku_segmentos: ['CATEGORIA', 'BRAND', 'MODEL', 'STORAGE_CAPACITY', 'COLOR'],
    });
    const result = await productService.crear({
      ...input,
      sku: undefined,
      atributos: { BRAND: 'Apple', MODEL: '15PM', STORAGE_CAPACITY: '256 GB', COLOR: 'Negro' },
    });
    expect(result.success).toBe(true);
    expect(repo.crear).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'TEC-AP-15PM-256-NEG' })
    );
  });

  it('rechaza si faltan atributos obligatorios de la plantilla', async () => {
    catRepo.obtenerPlantillaSku.mockResolvedValue({
      sku_prefijo: 'TEC',
      sku_segmentos: ['CATEGORIA', 'BRAND', 'MODEL'],
    });
    const result = await productService.crear({
      ...input,
      sku: undefined,
      atributos: { BRAND: 'Apple' },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('MISSING_REQUIRED_ATTRIBUTE');
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it('rechaza editar atributos que alterarían el SKU (inmutable)', async () => {
    catRepo.obtenerPlantillaSku.mockResolvedValue({
      sku_prefijo: 'TEC',
      sku_segmentos: ['CATEGORIA', 'BRAND', 'MODEL', 'STORAGE_CAPACITY', 'COLOR'],
    });
    repo.obtenerPorId.mockResolvedValue({
      ...row,
      sku: 'TEC-AP-15PM-256-NEG',
      atributos: { BRAND: 'Apple', MODEL: '15PM', STORAGE_CAPACITY: '256 GB', COLOR: 'Negro' },
    });
    const result = await productService.actualizar('p1', {
      atributos: { BRAND: 'Apple', MODEL: '15PM', STORAGE_CAPACITY: '256 GB', COLOR: 'Azul' },
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('SKU_INMUTABLE');
    expect(repo.actualizar).not.toHaveBeenCalled();
  });
});
