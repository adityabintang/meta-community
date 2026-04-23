import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BarChart3, Clock3, Eye, ExternalLink, Flag, Heart, Link2, MessageCircle, Send, Trash2, User } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useProduct } from "@/hooks/use-products";
import type { Product, ProductScreenshot } from "@/lib/api/products";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

type ProductComment = {
  id: string;
  product_id: string;
  user_name: string;
  content: string;
  created_at: string;
};

function getMediaUrl(media: unknown): string | null {
  if (!media) return null;

  if (typeof media === "string") {
    const trimmed = media.trim();
    return trimmed || null;
  }

  if (typeof media === "object") {
    const typedMedia = media as { url?: unknown; thumbnailURL?: unknown };
    if (typeof typedMedia.url === "string" && typedMedia.url.trim()) {
      return typedMedia.url;
    }
    if (typeof typedMedia.thumbnailURL === "string" && typedMedia.thumbnailURL.trim()) {
      return typedMedia.thumbnailURL;
    }
  }

  return null;
}

function getProductImages(product: Product): string[] {
  const screenshots = product.screenshots || [];
  const urls: string[] = [];

  for (const screenshot of screenshots) {
    if (!screenshot || typeof screenshot !== "object") continue;
    const typedScreenshot = screenshot as ProductScreenshot;
    const imageUrl = getMediaUrl(typedScreenshot.image);
    if (imageUrl) {
      urls.push(imageUrl);
    }
  }

  return urls;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function safeStat(value: unknown): string {
  if (typeof value === "number") return value.toLocaleString("id-ID");
  if (typeof value === "string" && value.trim()) return value;
  return "0";
}

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: product, isLoading, error } = useProduct(id);
  const token = localStorage.getItem("auth_token");
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [views, setViews] = useState(0);

  const images = product ? getProductImages(product) : [];
  const coverImage = images[0] || null;

  useEffect(() => {
    if (!product?.id) return;
    const storageKey = `product:views:${product.id}`;
    const current = Number(localStorage.getItem(storageKey) || "0");
    const next = Number.isFinite(current) ? current + 1 : 1;
    localStorage.setItem(storageKey, String(next));
    setViews(next);
  }, [product?.id]);

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

  useEffect(() => {
    if (!product?.id) return;

    const fetchEngagement = async () => {
      try {
        const [likesRes, commentsRes] = await Promise.all([
          fetch(`${CMS_API}/products/${product.id}/likes`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          fetch(`${CMS_API}/products/${product.id}/comments`),
        ]);

        if (likesRes.ok) {
          const likesData = await likesRes.json();
          setLikes(Number(likesData.total || 0));
          setLiked(Boolean(likesData.liked));
        }

        if (commentsRes.ok) {
          const commentsData = await commentsRes.json();
          setComments(commentsData.comments || []);
        }
      } catch {
        // Keep page usable if engagement fetch fails.
      }
    };

    fetchEngagement();
  }, [product?.id, token]);

  const handleLike = async () => {
    if (!product?.id) return;
    try {
      const res = await fetch(`${CMS_API}/products/${product.id}/likes`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to like product");
      }

      const data = await res.json();
      setLiked(Boolean(data.liked));
      setLikes(Number(data.total || 0));
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to like",
        variant: "destructive",
      });
    }
  };

  const reloadComments = async () => {
    if (!product?.id) return;
    const res = await fetch(`${CMS_API}/products/${product.id}/comments`);
    if (!res.ok) return;
    const data = await res.json();
    setComments(data.comments || []);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product?.id || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const res = await fetch(`${CMS_API}/products/${product.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to comment");
      }

      setNewComment("");
      await reloadComments();
      toast({ title: "Comment submitted" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to comment",
        variant: "destructive",
      });
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await fetch(`${CMS_API}/product-comments/${commentId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("Failed to delete comment");

      setComments((current) => current.filter((comment) => comment.id !== commentId));
      toast({ title: "Comment deleted" });
    } catch {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  const handleReportProduct = async () => {
    if (!product?.id) return;

    try {
      const reason = window.prompt("Alasan report (opsional, max 500 karakter):", "") || "";

      const res = await fetch(`${CMS_API}/products/${product.id}/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: reason.slice(0, 500) }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to report product");
      }

      toast({ title: data?.message || "Report submitted" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to report product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!product?.id || !isAdmin) return;
    if (!confirm("Delete this product after review?")) return;

    try {
      const res = await fetch(`${CMS_API}/products/${product.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.message || "Failed to delete product");
      }

      toast({ title: "Product deleted" });
      navigate("/dashboard/products");
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const creatorName = product?.ownerName || product?.technicalLead || "Anonymous Creator";
  const createdDate = formatDate(product?.createdAt || product?.created_at);
  const updatedDate = formatDate(product?.updatedAt);
  const actionLinks = [product?.productLink, product?.demoLink].filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );

  const stats = useMemo(
    () => [
      { label: "Views", value: safeStat(views), icon: Eye },
      { label: "Screenshots", value: safeStat(images.length), icon: BarChart3 },
      { label: "Links", value: safeStat(actionLinks.length), icon: Link2 },
      { label: "Updated", value: updatedDate === "-" ? createdDate : updatedDate, icon: Clock3 },
    ],
    [actionLinks.length, createdDate, images.length, updatedDate, views],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-5xl">
          <Link
            to="/product"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Product
          </Link>

          {!id ? <p className="text-sm text-red-500">ID product tidak valid.</p> : null}

          {isLoading && <p className="text-muted-foreground">Memuat detail product...</p>}

          {!isLoading && error && (
            <p className="text-sm text-red-500">
              {error instanceof Error ? error.message : "Gagal memuat detail product."}
            </p>
          )}

          {!isLoading && !error && product && (
            <div className="grid lg:grid-cols-3 gap-6">
              <article className="lg:col-span-2 rounded-2xl border border-border/50 bg-card shadow-card overflow-hidden">
                {images.length > 1 ? (
                  <div className="relative px-4 pt-4 md:px-6 md:pt-6">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {images.map((url, index) => (
                          <CarouselItem key={`${url}-${index}`}>
                            <div className="h-64 md:h-96 rounded-xl overflow-hidden bg-secondary/40">
                              <img
                                src={url}
                                alt={`${product.title} screenshot ${index + 1}`}
                                className="w-full h-full object-cover"
                                loading={index === 0 ? "eager" : "lazy"}
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-6 md:left-8" />
                      <CarouselNext className="right-6 md:right-8" />
                    </Carousel>
                  </div>
                ) : (
                  <div className="h-64 md:h-96 bg-secondary/40 overflow-hidden">
                    {coverImage ? (
                      <img src={coverImage} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 via-card to-accent/10" />
                    )}
                  </div>
                )}

                <div className="p-6 md:p-8">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 rounded-md bg-secondary text-foreground text-xs font-medium">
                      {formatLabel(product.category || "other")}
                    </span>
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      {product.ownerName || "Anonymous"}
                    </div>
                  </div>

                  <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4">
                    {product.title}
                  </h1>

                  <p className="text-muted-foreground leading-relaxed mb-6 whitespace-pre-line">
                    {product.description || "Tidak ada deskripsi."}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button variant={liked ? "default" : "outline"} onClick={handleLike} className="gap-2">
                      <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                      {likes} Likes
                    </Button>

                    {!isAdmin ? (
                      <Button variant="outline" onClick={handleReportProduct} className="gap-2">
                        <Flag className="w-4 h-4" />
                        Report Product
                      </Button>
                    ) : null}

                    {isAdmin ? (
                      <Button variant="destructive" onClick={handleDeleteProduct} className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Product
                      </Button>
                    ) : null}

                    {product.productLink ? (
                      <Button asChild>
                        <a href={product.productLink} target="_blank" rel="noopener noreferrer">
                          Kunjungi Product
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    ) : null}

                    {product.demoLink ? (
                      <Button asChild variant="outline">
                        <a href={product.demoLink} target="_blank" rel="noopener noreferrer">
                          Lihat Demo
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </a>
                      </Button>
                    ) : null}
                  </div>

                  {images.length > 1 ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Gunakan tombol panah pada gambar untuk melihat screenshot lainnya.
                    </p>
                  ) : null}

                  <section className="mt-8 border-t border-border/60 pt-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Comments ({comments.length})
                    </h2>

                    <form onSubmit={handleCommentSubmit} className="mb-6">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        rows={3}
                        className="mb-2"
                      />
                      <Button type="submit" disabled={!newComment.trim() || submittingComment}>
                        <Send className="w-4 h-4 mr-2" />
                        {submittingComment ? "Sending..." : "Send Comment"}
                      </Button>
                    </form>

                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className="rounded-lg border border-border/50 p-4">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-medium text-foreground">{comment.user_name || "Anonymous"}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {new Date(comment.created_at).toLocaleDateString("id-ID")}
                                </span>
                                {isAdmin ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500"
                                    onClick={() => handleDeleteComment(comment.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">{comment.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>
              </article>

              <aside className="space-y-4 lg:sticky lg:top-28 self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-1">
                <section className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Creator Profile</h2>
                  <div className="flex items-center gap-2 text-sm text-foreground mb-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{creatorName}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Published: {createdDate}</p>
                </section>

                <section className="rounded-xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-sm">
                  <h2 className="text-sm font-semibold text-foreground mb-3">Stats</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {stats.map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <div key={stat.label} className="rounded-lg border border-border/50 bg-background/50 p-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Icon className="w-3.5 h-3.5" />
                            {stat.label}
                          </div>
                          <p className="text-sm font-semibold text-foreground truncate">{stat.value}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
