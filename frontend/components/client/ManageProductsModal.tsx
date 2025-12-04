'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Check } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  type: 'product' | 'service';
}

interface ManageProductsModalProps {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageProductsModal({ clientId, onClose, onSuccess }: ManageProductsModalProps) {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all products
        const productsRes = await fetch('/api/products');
        const products = await productsRes.json();
        setAllProducts(products);

        // Fetch assigned products
        const assignedRes = await fetch(`/api/clients/${clientId}/products`);
        if (assignedRes.ok) {
          const assigned = await assignedRes.json();
          setAssignedProducts(assigned.map((p: Product) => p.id));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [clientId]);

  const filteredProducts = allProducts.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setAssignedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Get current assigned products
      const currentRes = await fetch(`/api/clients/${clientId}/products`);
      const current = await currentRes.json();
      const currentIds = current.map((p: Product) => p.id);

      // Determine what to add and remove
      const toAdd = assignedProducts.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id: string) => !assignedProducts.includes(id));

      // Add new products
      for (const productId of toAdd) {
        await fetch(`/api/clients/${clientId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, action: 'assign' }),
        });
      }

      // Remove products
      for (const productId of toRemove) {
        await fetch(`/api/clients/${clientId}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId, action: 'unassign' }),
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving products:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les produits/services</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher un produit ou service..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Products List */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchQuery ? 'Aucun résultat trouvé' : 'Aucun produit disponible'}
              </div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const isAssigned = assignedProducts.includes(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        isAssigned ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => toggleProduct(product.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isAssigned
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isAssigned && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                              <Badge variant={product.type === 'product' ? 'default' : 'secondary'}>
                                {product.type === 'product' ? 'Produit' : 'Service'}
                              </Badge>
                              <span>
                                {new Intl.NumberFormat('fr-MA', {
                                  style: 'currency',
                                  currency: 'MAD',
                                }).format(product.price)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">
              <strong>{assignedProducts.length}</strong> produit(s)/service(s) sélectionné(s)
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

