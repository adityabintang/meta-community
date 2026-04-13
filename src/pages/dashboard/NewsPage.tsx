import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

interface News {
  id: string | number;
  title: string;
  slug: string;
  content: any;
  thumbnail?: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  status: "draft" | "published";
  createdAt: string;
}

interface NewsLikeUser {
  name: string;
  email: string | null;
  isAnonymous: boolean;
  createdAt: string;
}

export default function NewsPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [likesDialogOpen, setLikesDialogOpen] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [selectedArticleTitle, setSelectedArticleTitle] = useState("");
  const [likeUsers, setLikeUsers] = useState<NewsLikeUser[]>([]);

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

  const fetchNews = async () => {
    try {
      const res = await fetch(`${CMS_API}/news`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setNews(data.docs || []);
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleDelete = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      const res = await fetch(`${CMS_API}/news/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast({ title: "Article deleted" });
        fetchNews();
      }
    } catch (error) {
      toast({ title: "Error deleting article", variant: "destructive" });
    }
  };

  const handleViewLikes = async (article: News) => {
    setSelectedArticleTitle(article.title);
    setLikesDialogOpen(true);
    setLikesLoading(true);
    try {
      const res = await fetch(`${CMS_API}/news/${article.id}/likes/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || "Failed to load likes");
      }

      const data = await res.json();
      setLikeUsers(data.likes || []);
    } catch (error) {
      toast({
        title: "Failed to load likes",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setLikeUsers([]);
    } finally {
      setLikesLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">News</h1>
          <p className="text-muted-foreground">Latest articles</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : news.filter((n) => n.status === "published").length === 0 ? (
              <p className="text-muted-foreground">No articles available.</p>
            ) : (
              <div className="space-y-4">
                {news
                  .filter((n) => n.status === "published")
                  .map((article) => (
                    <div
                      key={article.id}
                      className="p-4 border rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <h3 className="font-medium">{article.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {article.metaDescription || article.content?.slice(0, 100)}
                      </p>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">News</h1>
          <p className="text-muted-foreground">Manage articles & SEO</p>
        </div>
        <Button onClick={() => navigate("/dashboard/news/create")}>
          <Plus className="mr-2" size={18} />
          Write Article
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Articles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : news.length === 0 ? (
            <p className="text-muted-foreground">No articles yet. Write your first article!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Likes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {news.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell>
                      {article.thumbnail ? (
                        <img
                          src={article.thumbnail}
                          alt={article.title}
                          className="h-12 w-20 rounded-md object-cover border"
                        />
                      ) : (
                        <div className="h-12 w-20 rounded-md border bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{article.title}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-secondary px-2 py-1 rounded">
                        /news/{article.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={article.status === "published" ? "default" : "secondary"}
                      >
                        {article.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewLikes(article)}
                      >
                        <Heart className="mr-1 h-4 w-4" />
                        View Likes
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/dashboard/news/create?id=${encodeURIComponent(String(article.id))}`)}
                      >
                        <Pencil className="h-4 w-4 text-blue-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(article.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={likesDialogOpen} onOpenChange={setLikesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Likes: {selectedArticleTitle}</DialogTitle>
          </DialogHeader>

          {likesLoading ? (
            <p className="text-sm text-muted-foreground">Loading likes...</p>
          ) : likeUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No likes yet.</p>
          ) : (
            <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
              {likeUsers.map((like, index) => (
                <div key={`${like.name}-${index}`} className="rounded-md border p-3">
                  <p className="font-medium">{like.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {like.email || "Anonymous"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(like.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
