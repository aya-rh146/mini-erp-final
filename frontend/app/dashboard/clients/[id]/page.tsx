'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import ClientProducts from '@/components/client/ClientProducts';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import ManageProductsModal from '@/components/client/ManageProductsModal';

interface ClientProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'product' | 'service';
  assignedAt: string;
}

interface IncomeBreakdown {
  id: number;
  name: string;
  type: string;
  price: number;
}

export default function ClientDetailsPage() {
  const { id } = useParams();
  const [client, setClient] = useState<any>(null);
  const [products, setProducts] = useState<ClientProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalIncome, setTotalIncome] = useState(0);
  const [breakdown, setBreakdown] = useState<IncomeBreakdown[]>([]);
  const [showManageModal, setShowManageModal] = useState(false);
  const { toast } = useToast();

  const fetchClientData = async () => {
    try {
      // Fetch client details
      const clientRes = await fetch(`/api/clients/${id}`);
      if (!clientRes.ok) throw new Error('Failed to fetch client');
      const clientData = await clientRes.json();
      setClient(clientData);

      // Fetch client products
      const productsRes = await fetch(`/api/clients/${id}/products`);
      if (!productsRes.ok) throw new Error('Failed to fetch client products');
      const productsData = await productsRes.json();
      setProducts(productsData);

      // Fetch income breakdown
      const incomeRes = await fetch(`/api/clients/${id}/income`);
      if (incomeRes.ok) {
        const incomeData = await incomeRes.json();
        setTotalIncome(parseFloat(incomeData.totalIncome) || 0);
        setBreakdown(incomeData.breakdown || []);
      }
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [id]);

  const handleProductsUpdated = () => {
    fetchClientData();
    setShowManageModal(false);
    toast({
      title: 'Succès',
      description: 'Produits mis à jour avec succès',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {client.fullName || client.email || 'Client Details'}
        </h1>
      </div>

      {/* Total Income Card with Breakdown */}
      <Card className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white border-0 shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-white">
                  Revenu Total Généré
                </CardTitle>
                <p className="text-sm text-emerald-100 mt-1">
                  Basé sur les produits et services assignés
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold mb-6">
            {new Intl.NumberFormat('fr-MA', {
              style: 'currency',
              currency: 'MAD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(totalIncome)}
          </div>
          
          {breakdown.length > 0 && (
            <div className="mt-6 pt-6 border-t border-white/20">
              <h3 className="text-sm font-semibold text-white mb-3">Détail par produit/service</h3>
              <div className="space-y-2">
                {breakdown.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-emerald-100" />
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs bg-white/20 px-2 py-1 rounded">
                        {item.type === 'product' ? 'Produit' : 'Service'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold">
                      {new Intl.NumberFormat('fr-MA', {
                        style: 'currency',
                        currency: 'MAD',
                        minimumFractionDigits: 2,
                      }).format(item.price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Products Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Produits et services assignés</h2>
          <Button onClick={() => setShowManageModal(true)}>
            <Package className="mr-2 h-4 w-4" />
            Gérer les produits/services
          </Button>
        </div>
        <ClientProducts clientId={id as string} />
      </div>

      {showManageModal && (
        <ManageProductsModal
          clientId={id as string}
          onClose={() => setShowManageModal(false)}
          onSuccess={handleProductsUpdated}
        />
      )}
    </div>
  );
}
