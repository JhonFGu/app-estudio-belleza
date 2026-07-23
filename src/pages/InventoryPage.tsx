import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { formatCOP } from '../utils/format';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Boxes,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Button, IconButton, Badge, PageHeader, StatCard, Modal, Input, EmptyState, Tabs } from '../components/ui';
import type { TabItem } from '../components/ui';

export const InventoryPage: React.FC = () => {
  const { currentTenant, refreshTrigger, triggerRefresh } = useAppStore();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('10');
  const [minStock, setMinStock] = useState('3');
  const [category, setCategory] = useState('Cuidado Facial');

  const fetchProducts = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        headers: { 'x-tenant-id': currentTenant.id },
      });
      if (res.ok) {
        setProducts(await res.json());
      }
    } catch (err) {
      console.error('Error al cargar productos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [currentTenant, refreshTrigger]);

  const categories = Array.from(new Set(products.map((p) => p.category || 'General')));

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCat && p.active !== false;
  });

  // KPI calculations
  const totalProducts = products.filter((p) => p.active !== false).length;
  const totalStockUnits = products
    .filter((p) => p.active !== false)
    .reduce((sum, p) => sum + (parseInt(p.stock, 10) || 0), 0);
  const totalInventoryValue = products
    .filter((p) => p.active !== false)
    .reduce((sum, p) => sum + (parseFloat(p.price) || 0) * (parseInt(p.stock, 10) || 0), 0);
  const lowStockCount = products
    .filter((p) => p.active !== false && parseInt(p.stock, 10) <= parseInt(p.minStock || '2', 10)).length;

  const categoryTabs: TabItem[] = [
    { id: 'ALL', label: `Todas (${totalProducts})` },
    ...categories.map((cat) => ({ id: cat, label: cat })),
  ];

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setSku('');
    setPrice('');
    setCost('');
    setStock('10');
    setMinStock('3');
    setCategory('Cuidado Facial');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: any) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || '');
    setSku(p.sku || '');
    setPrice(p.price || '');
    setCost(p.cost || '');
    setStock(p.stock.toString());
    setMinStock((p.minStock || 3).toString());
    setCategory(p.category || 'General');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || parseFloat(price) <= 0) {
      alert('Por favor ingrese el nombre del producto y un precio de venta válido.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingProduct;
      const url = isEdit ? `/api/products?id=${editingProduct.id}` : '/api/products';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentTenant!.id,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          sku: sku.trim(),
          price: parseFloat(price).toFixed(2),
          cost: cost ? parseFloat(cost).toFixed(2) : '0.00',
          stock: parseInt(stock, 10) || 0,
          minStock: parseInt(minStock, 10) || 2,
          category: category.trim(),
        }),
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchProducts();
        triggerRefresh();
      } else {
        const err = await response.json();
        alert(`Error: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Desea desactivar este producto del inventario?')) return;
    try {
      const res = await fetch(`/api/products?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': currentTenant!.id },
      });
      if (res.ok) {
        fetchProducts();
        triggerRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-app-mint-100 border-t-app-mint animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Package />}
        title="Inventario de Productos Físicos"
        subtitle="Gestión de cremas, sueros y cosméticos para venta directa en el POS."
        actions={
          <Button icon={<Plus />} onClick={handleOpenCreateModal}>
            Nuevo Producto Físico
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          tone="mint"
          icon={<Boxes />}
          label="Total Productos"
          value={String(totalProducts)}
        />
        <StatCard
          tone="sky"
          icon={<TrendingUp />}
          label="Unidades en Stock"
          value={`${totalStockUnits} uds`}
        />
        <StatCard
          tone="lavender"
          icon={<DollarSign />}
          label="Valor Inventario"
          value={formatCOP(totalInventoryValue)}
        />
        <StatCard
          tone={lowStockCount > 0 ? 'peach' : 'lavender'}
          icon={<AlertTriangle />}
          label="Alertas Stock Bajo"
          value={`${lowStockCount} ítems`}
        />
      </div>

      <div className="bg-white p-4 rounded-[28px] border border-app-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="w-full sm:w-80">
          <Input
            icon={<Search />}
            placeholder="Buscar por nombre, SKU o descripción..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs
          tabs={categoryTabs}
          activeTab={selectedCategory}
          onChange={setSelectedCategory}
        />
      </div>

      <div className="bg-white rounded-[28px] border border-app-gray-200 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="No se encontraron productos"
            message="No hay productos registrados en el inventario."
          />
        ) : (
          <div className="overflow-x-auto p-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-app-gray-200 text-app-gray-500 font-bold bg-app-gray-50/50">
                  <th className="p-3.5 rounded-l-xl">Producto / SKU</th>
                  <th className="p-3.5">Categoría</th>
                  <th className="p-3.5">Precio Venta</th>
                  <th className="p-3.5">Costo Unit.</th>
                  <th className="p-3.5 text-center">Stock Actual</th>
                  <th className="p-3.5 text-center rounded-r-xl">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const stockNum = parseInt(p.stock, 10) || 0;
                  const minStockNum = parseInt(p.minStock || '2', 10);
                  const isLowStock = stockNum <= minStockNum;

                  return (
                    <tr key={p.id} className="border-b border-app-gray-50 hover:bg-app-gray-50/50">
                      <td className="p-3.5">
                        <div className="font-bold text-app-text-primary">{p.name}</div>
                        <div className="text-[10px] text-app-gray-500 font-mono">
                          SKU: {p.sku || 'SIN SKU'}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Badge variant="neutral">{p.category || 'General'}</Badge>
                      </td>
                      <td className="p-3.5 font-bold text-app-mint font-mono">
                        {formatCOP(parseFloat(p.price))}
                      </td>
                      <td className="p-3.5 font-semibold text-app-text-secondary font-mono">
                        {formatCOP(parseFloat(p.cost || '0'))}
                      </td>
                      <td className="p-3.5 text-center font-bold">
                        <Badge
                          variant={isLowStock ? 'warning' : 'success'}
                          dot
                          icon={isLowStock ? <AlertTriangle /> : undefined}
                        >
                          {stockNum} uds
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <IconButton
                            variant="edit"
                            label="Editar Producto"
                            onClick={() => handleOpenEditModal(p)}
                          />
                          <IconButton
                            variant="delete"
                            label="Desactivar Producto"
                            onClick={() => handleDeleteProduct(p.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Producto Físico' : 'Nuevo Producto Físico'}
        subtitle="Complete los datos para actualizar el catálogo e inventario."
        icon={<Package />}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre del Producto *"
            placeholder="ej. Bloqueador Solar SPF50, Crema Hidratante Ácido Hialurónico..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Código"
              placeholder="SOL-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="font-mono uppercase"
            />
            <Input
              label="Categoría"
              placeholder="Cuidado Facial"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio de Venta ($) *"
              type="number"
              step="500"
              placeholder="85000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="font-black text-app-mint font-mono"
            />
            <Input
              label="Costo Unitario ($)"
              type="number"
              step="500"
              placeholder="45000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Stock Disponible (Unidades)"
              type="number"
              placeholder="10"
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              required
            />
            <Input
              label="Stock Mínimo Alerta"
              type="number"
              placeholder="3"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-2xs font-extrabold uppercase tracking-wider text-app-text-secondary mb-1.5 block">Descripción</label>
            <textarea
              rows={2}
              placeholder="Detalles sobre presentación, beneficios o modo de empleo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-app-gray-200 rounded-xl text-xs bg-transparent outline-none focus:border-app-mint resize-none font-semibold"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setIsModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              fullWidth
            >
              Guardar Producto
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
