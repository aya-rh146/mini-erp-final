'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';

export interface ClientProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'product' | 'service';
  assignedAt: string;
}

interface ClientProductsProps {
  clientId: string;
}

export default function ClientProducts({ clientId }: ClientProductsProps) {
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);

  useEffect(() => {
    const fetchClientProducts = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}/products`);
        if (!response.ok) throw new Error('Failed to fetch client products');
        const data = await response.json();
        setProducts(data);
        
        // Calculate total income
        const income = data.reduce(
          (sum: number, product: ClientProduct) => sum + (product.price || 0),
          0
        );
        setTotalIncome(income);
      } catch (error) {
        console.error('Error fetching client products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientProducts();
  }, [clientId]);

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  if (products.length === 0) {
    return <div className="text-muted-foreground">Aucun produit ou service assigné.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="h-full hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant={product.type === 'product' ? 'default' : 'secondary'}>
                  {product.type === 'product' ? 'Produit' : 'Service'}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Assigné le {new Date(product.assignedAt).toLocaleDateString('fr-FR')}
              </div>
            </CardHeader>
            <CardContent>
              {product.description && (
                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
              )}
              <div className="text-lg font-semibold">
                {new Intl.NumberFormat('fr-MA', {
                  style: 'currency',
                  currency: 'MAD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(product.price)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
