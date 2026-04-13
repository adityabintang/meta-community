import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

interface NewsFormData {
  title: string;
  slug: string;
  content: string;
  thumbnail?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  status: "draft" | "published";
}

function normalizeArticleContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (content && typeof content === "object") {
    const maybeHtml = (content as { html?: unknown }).html;
    if (typeof maybeHtml === "string") {
      return maybeHtml;
    }

    const maybeText = (content as { text?: unknown }).text;
    if (typeof maybeText === "string") {
      return `<p>${maybeText}</p>`;
    }
  }

  return "";
}

export default function NewsCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const articleId = searchParams.get("id");
  const isEditMode = Boolean(articleId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");

  const [formData, setFormData] = useState<NewsFormData>({
    title: "",
    slug: "",
    content: "",
    thumbnail: "",
    metaTitle: "",
    metaDescription: "",
    keywords: "",
    status: "draft",
  });

  const token = localStorage.getItem("auth_token");

  // Check auth
  useEffect(() => {
    const userStr = localStorage.getItem("auth_user");
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user || user.role !== "admin") {
        navigate("/dashboard/news");
      }
    } catch {
      navigate("/dashboard/news");
    }
  }, [navigate]);

  useEffect(() => {
    if (!articleId) return;

    const loadArticle = async () => {
      setIsLoadingArticle(true);
      try {
        const res = await fetch(`${CMS_API}/news/${articleId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error("Failed to load article");
        }

        const data = await res.json();
        const doc = data.doc || {};

        const thumbnail = doc.thumbnail || "";
        setFormData({
          title: doc.title || "",
          slug: doc.slug || "",
          content: normalizeArticleContent(doc.content),
          thumbnail,
          metaTitle: doc.metaTitle ?? doc.meta_title ?? "",
          metaDescription: doc.metaDescription ?? doc.meta_description ?? "",
          keywords: doc.keywords || "",
          status: doc.status === "published" ? "published" : "draft",
        });
        setThumbnailPreview(thumbnail);
      } catch (error) {
        toast({
          title: "Failed to load article",
          description: error instanceof Error ? error.message : "Please try again",
          variant: "destructive",
        });
        navigate("/dashboard/news");
      } finally {
        setIsLoadingArticle(false);
      }
    };

    loadArticle();
  }, [articleId, navigate, token]);

  const handleTitleChange = (title: string) => {
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    setFormData({ ...formData, title, slug });
  };

  const handleThumbnailClick = () => {
    fileInputRef.current?.click();
  };

  const handleThumbnailSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingThumbnail(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setFormData({ ...formData, thumbnail: data.url });
      setThumbnailPreview(data.url);
      toast({ title: "Thumbnail uploaded successfully" });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({ title: "Failed to upload thumbnail", variant: "destructive" });
    } finally {
      setIsUploadingThumbnail(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.slug.trim() || !formData.content.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(isEditMode ? `${CMS_API}/news/${articleId}` : `${CMS_API}/news`, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast({ title: isEditMode ? "Article updated successfully" : "Article created successfully" });
        navigate("/dashboard/news");
      } else {
        const error = await res.json();
        toast({ title: error.message || "Failed to create article", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error creating article", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/dashboard/news")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? "Edit Article" : "Create New Article"}</h1>
          <p className="text-muted-foreground">
            {isEditMode
              ? "Update article content, thumbnail, and SEO settings"
              : "Write and publish an article with images and SEO optimization"}
          </p>
        </div>
      </div>

      {isLoadingArticle ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading article data...
          </CardContent>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Slug */}
            <Card>
              <CardHeader>
                <CardTitle>Article Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter article title"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="slug">URL Slug (Auto-generated) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="article-url-slug"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    URL: /news/{formData.slug}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Content Editor */}
            <Card>
              <CardHeader>
                <CardTitle>Content *</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Write your article. You can insert images by clicking the image button in the toolbar.
                </p>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Write your article content here..."
                />
              </CardContent>
            </Card>

            {/* SEO Settings */}
            <Card>
              <CardHeader>
                <CardTitle>SEO Settings</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Optimize your article for search engines
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                    placeholder={formData.title || "Leave blank to use article title"}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.metaTitle.length}/60 characters (optimal: 50-60)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                    placeholder="Brief description of your article"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.metaDescription.length}/160 characters (optimal: 120-160)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="keywords">Keywords/Tags</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple keywords with commas
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Thumbnail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thumbnail</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Article cover image</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailSelected}
                  style={{ display: "none" }}
                />

                {thumbnailPreview ? (
                  <div className="relative group">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full h-auto rounded-lg object-cover aspect-video"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleThumbnailClick}
                      disabled={isUploadingThumbnail}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={handleThumbnailClick}
                    className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    {isUploadingThumbnail ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium">Upload thumbnail</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WebP (max 5MB)</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "draft" | "published",
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.status === "published"
                    ? "This article will be visible to everyone"
                    : "This article is only visible to admins"}
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? "Saving..." : "Publishing..."}
                  </>
                ) : (
                  isEditMode ? "Save Article" : "Publish Article"
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
