import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader2, Image, X, Plus, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

const PRODUCT_CATEGORIES = [
  "Hardware & Computing",
  "Software & Apps",
  "Services",
  "Education",
  "Design",
  "Development",
  "Marketing",
  "Business",
  "Other"
];

export default function ProductsCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("id");
  const isEditMode = Boolean(productId);
  const token = localStorage.getItem("auth_token");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false);
  const [screenshotUrls, setScreenshotUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    tags: [] as string[],
    ownerName: "",
    ownerEmail: "",
    productLink: "",
    demoLink: "",
    technicalLead: "",
    supportEmail: "",
  });

  const user = useMemo(() => {
    try {
      const userStr = localStorage.getItem("auth_user");
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [navigate, user]);

  const screenshotList = useMemo(() => screenshotUrls, [screenshotUrls]);

  const uploadScreenshotFiles = async (files: File[]) => {
    if (!files.length) return;

    const validFiles = files.filter((file) => {
      const isImage = ["image/png", "image/jpeg", "image/jpg"].includes(file.type);
      const isSizeValid = file.size <= 10 * 1024 * 1024;
      return isImage && isSizeValid;
    });

    if (validFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Upload PNG/JPG files with max size 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingScreenshots(true);
    try {
      const uploadedUrls = await Promise.all(
        validFiles.map(async (file) => {
          const payload = new FormData();
          payload.append("file", file);

          const res = await fetch(`${CMS_API}/upload`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: payload,
          });

          if (!res.ok) {
            throw new Error("Failed to upload screenshot");
          }

          const data = await res.json();
          return data.url as string;
        }),
      );

      setScreenshotUrls((prev) => [...prev, ...uploadedUrls]);
      toast({ title: `${uploadedUrls.length} screenshot uploaded` });
    } catch {
      toast({
        title: "Upload failed",
        description: "Some screenshots failed to upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingScreenshots(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    await uploadScreenshotFiles(files);
    e.currentTarget.value = "";
  };

  const handleDropScreenshots = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    await uploadScreenshotFiles(files);
  };

  const removeScreenshot = (url: string) => {
    setScreenshotUrls((prev) => prev.filter((item) => item !== url));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()]
      });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast({ title: "Product name is required", variant: "destructive" });
      return;
    }

    if (!formData.category) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(isEditMode ? `${CMS_API}/products/${productId}` : `${CMS_API}/products`, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          description: formData.description,
          tags: formData.tags,
          ownerName: formData.ownerName || user?.name || "Anonymous",
          ownerEmail: formData.ownerEmail || user?.email || "",
          productLink: formData.productLink,
          demoLink: formData.demoLink,
          technicalLead: formData.technicalLead,
          supportEmail: formData.supportEmail,
          screenshots: screenshotList.map((url, idx) => ({
            image: url,
            caption: `Screenshot ${idx + 1}`,
          })),
          status: "approved",
        }),
      });

      if (res.ok) {
        toast({ title: isEditMode ? "Product updated successfully." : "Product submitted successfully." });
        navigate("/dashboard/products");
      } else {
        const err = await res.json();
        toast({
          title: err.message || "Failed to submit product",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error submitting product", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!productId || !token) return;

    const loadProduct = async () => {
      setIsLoadingProduct(true);
      try {
        const res = await fetch(`${CMS_API}/products/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error("Failed to load product");
        }

        const data = await res.json();
        const doc = data.doc || {};
        const screenshots = Array.isArray(doc.screenshots)
          ? doc.screenshots
          : typeof doc.screenshots === "string"
            ? (() => {
                try {
                  return JSON.parse(doc.screenshots);
                } catch {
                  return [];
                }
              })()
            : [];

        setFormData({
          title: doc.title || "",
          category: doc.category || "",
          description: doc.description || "",
          tags: Array.isArray(doc.tags)
            ? doc.tags
            : typeof doc.tags === "string"
              ? doc.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean)
              : [],
          ownerName: doc.ownerName || "",
          ownerEmail: doc.ownerEmail || "",
          productLink: doc.productLink || "",
          demoLink: doc.demoLink || "",
          technicalLead: doc.technicalLead || "",
          supportEmail: doc.supportEmail || "",
        });
        setScreenshotUrls(
          Array.isArray(screenshots)
            ? screenshots
                .map((item) => {
                  if (typeof item === "string") return item;
                  if (item && typeof item === "object" && typeof item.image === "string") {
                    return item.image;
                  }
                  return null;
                })
                .filter(Boolean)
            : [],
        );
      } catch {
        toast({
          title: "Failed to load product",
          variant: "destructive",
        });
        navigate("/dashboard/products");
      } finally {
        setIsLoadingProduct(false);
      }
    };

    loadProduct();
  }, [CMS_API, navigate, productId, token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/products")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Submit Product</h1>
          <p className="text-muted-foreground">{isEditMode ? "Update your product details" : "Share your product with comprehensive details"}</p>
        </div>
      </div>

      {isLoadingProduct && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading product data...
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Product Name *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="My Awesome Product"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="tags">Tags</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add a tag and press Enter"
                    />
                    <Button type="button" onClick={handleAddTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer">
                          {tag}
                          <X className="ml-1 h-3 w-3" onClick={() => handleRemoveTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="description">Product Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe your product in detail..."
                    rows={8}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Screenshots & Media */}
            <Card>
              <CardHeader>
                <CardTitle>Screenshots & Media</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  <Label>Screenshots</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    multiple
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <div
                    className="rounded-xl border border-dashed bg-muted/30 p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropScreenshots}
                  >
                    <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="text-base font-medium">Drag & Drop files here or Click to upload.</p>
                    <p className="text-sm text-muted-foreground">Supports multiple images (PNG, JPG) up to 10MB.</p>
                    {isUploadingScreenshots && (
                      <p className="mt-2 text-sm text-muted-foreground">Uploading screenshots...</p>
                    )}
                  </div>

                  {screenshotList.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {screenshotList.map((url, idx) => (
                        <div key={`${url}-${idx}`} className="group relative overflow-hidden rounded-lg border bg-background">
                          <img
                            src={url}
                            alt={`Screenshot ${idx + 1}`}
                            className="aspect-video w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(url)}
                            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={`Remove screenshot ${idx + 1}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Screenshots ini akan dipakai sebagai source slider pada halaman product.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Product Links */}
            <Card>
              <CardHeader>
                <CardTitle>Product Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="productLink">Website URL</Label>
                  <Input
                    id="productLink"
                    type="url"
                    value={formData.productLink}
                    onChange={(e) =>
                      setFormData({ ...formData, productLink: e.target.value })
                    }
                    placeholder="https://yourproduct.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="demoLink">Demo URL</Label>
                  <Input
                    id="demoLink"
                    type="url"
                    value={formData.demoLink}
                    onChange={(e) =>
                      setFormData({ ...formData, demoLink: e.target.value })
                    }
                    placeholder="https://demo.yourproduct.com"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="technicalLead">Technical Lead</Label>
                  <Input
                    id="technicalLead"
                    value={formData.technicalLead}
                    onChange={(e) =>
                      setFormData({ ...formData, technicalLead: e.target.value })
                    }
                    placeholder={formData.ownerName || "John Doe"}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, supportEmail: e.target.value })
                    }
                    placeholder="support@example.com"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="ownerName">Your Name</Label>
                    <Input
                      id="ownerName"
                      value={formData.ownerName}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerName: e.target.value })
                      }
                      placeholder={user?.name || "Your name"}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="ownerEmail">Your Email</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={formData.ownerEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, ownerEmail: e.target.value })
                      }
                      placeholder={user?.email || "email@example.com"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar - Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Live Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Product Card Preview */}
                <div className="rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="font-semibold line-clamp-2">
                      {formData.title || "Product title"}
                    </p>
                    {formData.category && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formData.category}
                      </p>
                    )}
                  </div>

                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {formData.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {formData.description || "Product description will appear here."}
                  </p>

                  <div className="flex flex-col gap-2 pt-2">
                    {formData.productLink && (
                      <a
                        href={formData.productLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Visit Website
                      </a>
                    )}
                    {formData.demoLink && (
                      <a
                        href={formData.demoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Demo
                      </a>
                    )}
                  </div>
                </div>

                {/* Screenshots Preview */}
                {screenshotList.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {screenshotList.slice(0, 4).map((url) => (
                      <img
                        key={url}
                        src={url}
                        alt="Screenshot preview"
                        className="aspect-video w-full rounded border object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    <Image className="mx-auto mb-2 h-5 w-5" />
                    Screenshots will appear here
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditMode ? "Saving..." : "Submitting..."}
                </>
              ) : (
                isEditMode ? "Save Product" : "Submit Product"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
