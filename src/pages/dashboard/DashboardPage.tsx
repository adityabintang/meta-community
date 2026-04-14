import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Calendar,
  ShoppingBag,
  Video,
  FileText,
  Users,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface Stats {
  events: number;
  products: number;
  recordings: number;
  news: number;
  users: number;
}

interface DashboardMetrics {
  userRegistrationsDaily: { date: string; count: number }[];
  projectSubmissionsDaily: { date: string; count: number }[];
  totals: {
    registeredUsers: number;
    projectSubmissions: number;
    uniqueProjectSubmitters: number;
  };
}

const CMS_API = import.meta.env.VITE_CMS_API_URL || "/api";

async function fetchStats(): Promise<Stats> {
  const token = localStorage.getItem("auth_token");
  
  const [events, products, recordings, news] = await Promise.all([
    fetch(`${CMS_API}/events?limit=0`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()),
    fetch(`${CMS_API}/products?limit=0`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()),
    fetch(`${CMS_API}/recordings?limit=0`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()),
    fetch(`${CMS_API}/news?limit=0`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).then((r) => r.json()),
  ]);

  return {
    events: events.totalDocs || 0,
    products: products.totalDocs || 0,
    recordings: recordings.totalDocs || 0,
    news: news.totalDocs || 0,
    users: 0,
  };
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${CMS_API}/dashboard/metrics`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error("Failed to fetch dashboard metrics");
  }

  return res.json();
}

function buildDailySeries(points: { date: string; count: number }[], days: number = 14) {
  const map = new Map(points.map((point) => [point.date, Number(point.count || 0)]));
  const result: { date: string; label: string; count: number }[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    current.setDate(current.getDate() - i);

    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    const isoDate = `${yyyy}-${mm}-${dd}`;

    result.push({
      date: isoDate,
      label: `${dd}/${mm}`,
      count: map.get(isoDate) || 0,
    });
  }

  return result;
}

const registrationChartConfig = {
  count: {
    label: "Registrations",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const projectChartConfig = {
  count: {
    label: "Project Submissions",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const statsCards = [
  {
    title: "Events",
    icon: Calendar,
    color: "bg-blue-500",
    href: "/dashboard/events",
  },
  {
    title: "Products",
    icon: ShoppingBag,
    color: "bg-green-500",
    href: "/dashboard/products",
  },
  {
    title: "Recordings",
    icon: Video,
    color: "bg-red-500",
    href: "/dashboard/recordings",
  },
  {
    title: "News",
    icon: FileText,
    color: "bg-purple-500",
    href: "/dashboard/news",
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    events: 0,
    products: 0,
    recordings: 0,
    news: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    userRegistrationsDaily: [],
    projectSubmissionsDaily: [],
    totals: {
      registeredUsers: 0,
      projectSubmissions: 0,
      uniqueProjectSubmitters: 0,
    },
  });

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    if (!isAdmin) {
      setMetricsLoading(false);
      return;
    }

    fetchDashboardMetrics()
      .then(setMetrics)
      .catch((error) => {
        console.error("Failed to fetch dashboard metrics:", error);
      })
      .finally(() => setMetricsLoading(false));
  }, [isAdmin]);

  const getStatValue = (title: string) => {
    const key = title.toLowerCase() as keyof Stats;
    return stats[key] || 0;
  };

  const registrationSeries = buildDailySeries(metrics.userRegistrationsDaily, 14);
  const projectSeries = buildDailySeries(metrics.projectSubmissionsDaily, 14);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name || user?.email}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.filter((card) => isAdmin || card.title !== "News").map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </CardTitle>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">
                      {loading ? "..." : getStatValue(card.title)}
                    </div>
                    <Link
                      to={card.href}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>User Registrations (14 days)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total users: {metricsLoading ? "..." : metrics.totals.registeredUsers}
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={registrationChartConfig} className="h-[220px] w-full">
                  <AreaChart data={registrationSeries} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={18}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      fill="var(--color-count)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/dashboard/events">
                  <Calendar className="mr-2" size={18} />
                  Create New Event
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/dashboard/products">
                  <ShoppingBag className="mr-2" size={18} />
                  Add New Product
                </Link>
              </Button>
              {isAdmin && (
                <>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/dashboard/recordings">
                      <Video className="mr-2" size={18} />
                      Add Recording
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/dashboard/news">
                      <FileText className="mr-2" size={18} />
                      Write Article
                    </Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle>Project Submissions (14 days)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Submitters: {metricsLoading ? "..." : metrics.totals.uniqueProjectSubmitters} | Submissions: {metricsLoading ? "..." : metrics.totals.projectSubmissions}
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={projectChartConfig} className="h-[220px] w-full">
                  <AreaChart data={projectSeries} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={18}
                    />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-count)"
                      fill="var(--color-count)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                No recent activity. Start by creating your first content!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
