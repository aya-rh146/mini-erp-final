'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type ProductType = 'product' | 'service';

interface ApiErrorResponse {
  message?: string;
  error?: string;
  field?: string;
  [key: string]: any;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: ProductType;
  createdAt: string;
  updatedAt: string;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  type: ProductType;
}

export default function ProductsPage() {
  // Toujours initialiser avec un tableau vide pour éviter les erreurs
  const [products, setProducts] = useState<Product[]>(() => []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '0',
    type: 'product',
  });

  const { toast } = useToast();
  const router = useRouter();

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const result = await response.json();
      console.log('Réponse de l\'API produits:', result);
      
      // S'assurer que products est toujours un tableau
      const productsData = Array.isArray(result.data) ? result.data : 
                          Array.isArray(result) ? result : [];
      
      setProducts(productsData);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits',
        variant: 'destructive',
      });
      setProducts([]); // S'assurer que products est toujours un tableau
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const validateForm = (data: ProductFormData): boolean => {
    if (!data.name.trim()) {
      toast({
        title: 'Erreur de validation',
        description: 'Le nom est requis',
        variant: 'destructive',
      });
      return false;
    }
    const price = parseFloat(data.price);
    if (isNaN(price) || price < 0) {
      toast({
        title: 'Erreur de validation',
        description: 'Veuillez entrer un prix valide',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(formData)) return;

    setIsSubmitting(true);
    try {
      // Validation des données du formulaire
      if (!formData.name || !formData.price) {
        throw new Error('Le nom et le prix sont obligatoires');
      }

      // Convertir l'ID en nombre pour le backend
      const productId = editingProduct ? parseInt(editingProduct.id, 10) : null;
      if (productId !== null && isNaN(productId)) {
        throw new Error('ID de produit invalide');
      }
      
      const url = productId !== null && !isNaN(productId)
        ? `/api/products/${productId}`
        : '/api/products';
      
      const method = productId !== null ? 'PUT' : 'POST';
      
      // Préparer les données à envoyer
      const requestBody = {
        ...formData,
        price: parseFloat(formData.price),
      };

      // Appel API
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      // Gestion de la réponse
      let responseData: ApiErrorResponse = {};
      try {
        const text = await response.text();
        responseData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Erreur lors de l\'analyse de la réponse:', parseError);
        throw new Error('Réponse du serveur invalide');
      }

      // Gestion des erreurs HTTP
      if (!response.ok) {
        console.error('Erreur API:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        let errorMessage = 'Une erreur est survenue';
        
        if (responseData) {
          // Si le backend renvoie un message d'erreur structuré
          if (responseData.message) {
            errorMessage = responseData.message;
          } else if (responseData.error) {
            errorMessage = responseData.error;
            
            // Ajouter des détails spécifiques au champ si disponible
            if (responseData.field) {
              errorMessage += ` (champ: ${responseData.field})`;
            }
          }
        }
        
        // Messages d'erreur génériques selon le code d'état HTTP
        if (!errorMessage || errorMessage === 'Une erreur est survenue') {
          if (response.status === 400) {
            errorMessage = 'Données invalides';
          } else if (response.status === 401) {
            errorMessage = 'Non autorisé - Veuillez vous reconnecter';
          } else if (response.status === 403) {
            errorMessage = 'Accès refusé';
          } else if (response.status === 404) {
            errorMessage = 'Ressource non trouvée';
          } else if (response.status >= 500) {
            errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
          }
        }
        
        throw new Error(errorMessage);
      }
      
      // Mise à jour de l'état local après une opération réussie
      if (response.ok) {
        // Mettre à jour l'état local
        setProducts(prevProducts => {
          if (editingProduct) {
            // Mise à jour d'un produit existant
            return prevProducts.map(p => 
              p.id === editingProduct.id ? { 
                ...p,
                ...(responseData.data || responseData), // Utiliser data si disponible, sinon la réponse complète
                id: editingProduct.id // Garder le même ID
              } : p
            );
          } else {
            // Ajout d'un nouveau produit
            const newProduct = responseData.data || responseData;
            return [...prevProducts, {
              ...newProduct,
              id: newProduct.id || String(Date.now()),
              price: typeof newProduct.price === 'string' ? parseFloat(newProduct.price) : newProduct.price || 0,
              type: newProduct.type || 'product',
              description: newProduct.description || null,
              createdAt: newProduct.createdAt || new Date().toISOString(),
              updatedAt: newProduct.updatedAt || new Date().toISOString()
            }];
          }
        });
      }

      // Succès
      toast({
        title: 'Succès',
        description: editingProduct ? 'Produit mis à jour avec succès' : 'Produit créé avec succès',
      });

      setIsDialogOpen(false);
      setEditingProduct(null);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue lors de l\'enregistrement';
      console.error('Erreur lors de la soumission:', error);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      toast({
        title: 'Erreur',
        description: 'ID de produit invalide',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) return;
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // Important pour l'authentification
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Erreur lors de la suppression:', {
          status: response.status,
          statusText: response.statusText,
          data: responseData
        });

        let errorMessage = 'Échec de la suppression du produit';
        if (response.status === 404) {
          errorMessage = 'Produit non trouvé';
        } else if (response.status === 400) {
          errorMessage = responseData.message || 'Requête invalide';
        } else if (response.status >= 500) {
          errorMessage = 'Erreur serveur - Veuillez réessayer plus tard';
        }

        throw new Error(errorMessage);
      }

      toast({
        title: 'Succès',
        description: responseData.message || 'Produit supprimé avec succès',
      });

      // Recharger la liste des produits
      await fetchProducts();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      type: product.type,
    });
    setIsDialogOpen(true);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (value: string) => {
    setFormData(prev => ({ ...prev, type: value as ProductType }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Produits & Services</h1>
          <p className="text-muted-foreground">Gérez vos produits et services</p>
        </div>
        <Button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: '',
              description: '',
              price: '0',
              type: 'product',
            });
            setIsDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau Produit
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des produits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Prix</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={`product-${product.id}`}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="capitalize">
                      {product.type === 'product' ? 'Produit' : 'Service'}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('fr-MA', {
                        style: 'currency',
                        currency: 'MAD',
                        minimumFractionDigits: 2,
                      }).format(product.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(product.id)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Aucun produit trouvé. Ajoutez votre premier produit pour commencer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nom du produit"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Description du produit"
                disabled={isSubmitting}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Prix (MAD)</label>
                <Input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  required
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={handleTypeChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product">Produit</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingProduct ? 'Mise à jour...' : 'Création...'}
                  </>
                ) : editingProduct ? (
                  'Mettre à jour'
                ) : (
                  'Créer'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}