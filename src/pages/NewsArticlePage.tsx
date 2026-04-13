import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  content: string;
  thumbnail?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string;
  status: "draft" | "published";
  created_at: string;
  createdAt?: string;
};

type Comment = {
  id: string;
  news_id: string;
  user_name: string;
  content: string;
  status: string;
  created_at: string;
};

export default function NewsArticlePage() {
  const { slug } = useParams();
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    let cancelled = false;

    const fetchArticle = async () => {
      if (!slug) {
        setError("Article not found");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${CMS_API}/news/slug/${encodeURIComponent(slug)}`);

        if (!response.ok) {
          throw new Error("Article not found");
        }

        const data = await response.json();
        const found = data.doc as NewsArticle | undefined;

        if (!cancelled) {
          if (!found) {
            setError("Article not found");
          } else {
            setArticle(found);
            // Fetch likes and whether current actor has liked this article
            const likesRes = await fetch(`${CMS_API}/news/${found.id}/likes`);
            const likesData = await likesRes.json();
            setLikes(likesData.total || 0);
            setLiked(Boolean(likesData.liked));
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load article");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchArticle();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!article?.id) return;

    const fetchComments = async () => {
      try {
        const res = await fetch(`${CMS_API}/news/${article.id}/comments`);
        const data = await res.json();
        setComments(data.comments || []);
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      }
    };

    fetchComments();
  }, [article?.id]);

  const handleLike = async () => {
    if (!article) return;

    try {
      const res = await fetch(`${CMS_API}/news/${article.id}/likes`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setLiked(data.liked);
      setLikes(Number(data.total || 0));
    } catch (err) {
      toast({ title: "Failed to like", variant: "destructive" });
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !newComment.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${CMS_API}/news/${article.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: newComment }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({ title: data.message || "Comment submitted!" });
        setNewComment("");
        // Refresh comments
        const commentsRes = await fetch(`${CMS_API}/news/${article.id}/comments`);
        const commentsData = await commentsRes.json();
        setComments(commentsData.comments || []);
      }
    } catch (err) {
      toast({ title: "Failed to comment", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    try {
      const res = await fetch(`${CMS_API}/news-comments/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        toast({ title: "Comment deleted" });
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <Link to="/news" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke News
          </Link>

          {loading && <p className="text-muted-foreground">Loading article...</p>}

          {!loading && error && <p className="text-red-500">{error}</p>}

          {!loading && !error && article && (
            <>
              <article className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 shadow-card">
                {article.thumbnail && (
                  <div className="mb-6 overflow-hidden rounded-xl bg-secondary/40">
                    <img src={article.thumbnail} alt={article.title} className="w-full max-h-[420px] object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(article.createdAt || article.created_at).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <h1 className="text-2xl md:text-4xl font-display font-bold text-foreground mb-4">{article.title}</h1>

                {article.metaDescription && (
                  <p className="text-muted-foreground mb-6">{article.metaDescription}</p>
                )}

                <div
                  className="prose prose-zinc dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: article.content || "" }}
                />

                {/* Like Button */}
                <div className="mt-8 pt-6 border-t">
                  <Button
                    variant={liked ? "default" : "outline"}
                    onClick={handleLike}
                    className="gap-2"
                  >
                    <Heart className={`w-4 h-4 ${liked ? "fill-current" : ""}`} />
                    {likes} Likes
                  </Button>
                </div>
              </article>

              {/* Comments Section */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Comments ({comments.length})
                </h2>

                {/* Comment Form */}
                <form onSubmit={handleComment} className="mb-6">
                  <Textarea
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="mb-2"
                    rows={3}
                  />
                  <Button type="submit" disabled={submitting || !newComment.trim()}>
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? "Sending..." : "Send Comment"}
                  </Button>
                </form>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{comment.user_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.created_at).toLocaleDateString("id-ID")}
                            </span>
                            {user?.role === "admin" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="h-6 w-6 text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground">{comment.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
