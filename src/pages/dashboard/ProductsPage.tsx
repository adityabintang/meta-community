import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Pencil, Image, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

interface Screenshot {
  id: string;
  image: string;
  caption?: string;
}

interface Product {
  id: string;
  title: string;
  description: string;
  screenshots: Screenshot[];
  ownerName: string;
  ownerEmail: string;
  productLink: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function normalizeScreenshots(input: unknown): Screenshot[] {
  if (Array.isArray(input)) {
    return input
      .map((item, index) => {
        if (typeof item === "string") {
          return { id: `${index}`, image: item, caption: "" };
        }

        if (item && typeof item === "object") {
          const maybeImage = (item as { image?: unknown }).image;
          const maybeCaption = (item as { caption?: unknown }).caption;
          const maybeId = (item as { id?: unknown }).id;

          if (typeof maybeImage === "string") {
            return {
              id: typeof maybeId === "string" ? maybeId : `${index}`,
              image: maybeImage,
              caption: typeof maybeCaption === "string" ? maybeCaption : "",
            };
          }
        }

        return null;
      })
      .filter((item): item is Screenshot => item !== null);
  }

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      return normalizeScreenshots(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("auth_token");

  const getUserFromStorage = () => {
    try {
      const userStr = localStorage.getItem("auth_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const user = getUserFromStorage();
  const isAdmin = user?.role === "admin";

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${CMS_API}/products`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const normalizedProducts = (data.docs || []).map((product: Product & { screenshots?: unknown }) => ({
        ...product,
        screenshots: normalizeScreenshots(product.screenshots),
      }));
      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`${CMS_API}/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Product deleted" });
        fetchProducts();
      }
    } catch (error) {
      toast({ title: "Error deleting product", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Product Showcase</h1>
          <p className="text-muted-foreground">
            Submit your product for showcase
          </p>
        </div>
        <Button onClick={() => navigate("/dashboard/products/create")}>
          <Plus className="mr-2" size={18} />
          Submit Product
        </Button>
      </div>

      {/* Products Grid */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Image className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No products yet. Be the first to submit your product!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {/* Carousel Screenshot */}
              {product.screenshots && product.screenshots.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {product.screenshots.map((shot, idx) => (
                      <CarouselItem key={idx}>
                        <div className="relative aspect-video bg-muted">
                          <img
                            src={shot.image}
                            alt={`${product.title} screenshot ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://placehold.co/600x400?text=No+Image";
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {product.screenshots.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Image className="h-12 w-12 text-muted-foreground" />
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-1">
                    {product.title}
                  </CardTitle>
                  {getStatusBadge(product.status)}
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {product.description || "No description"}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span>by {product.ownerName || "Anonymous"}</span>
                  <span>
                    {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex gap-2">
                  {product.productLink && (
                    <Button variant="outline" size="sm" className="flex-1" asChild>
                      <a
                        href={product.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1" size={14} />
                        Visit
                      </a>
                    </Button>
                  )}

                  {isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </>
                  )}

                  {!isAdmin && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/dashboard/products/create?id=${encodeURIComponent(String(product.id))}`,
                          )
                        }
                      >
                        <Pencil size={14} className="text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
