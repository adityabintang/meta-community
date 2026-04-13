import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Index from "./pages/Index";
import EventPage from "./pages/EventPage";
import ProductPage from "./pages/ProductPage";
import EventDetailPage from "./pages/EventDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import NewsPublicPage from "./pages/NewsPublicPage";
import NewsArticlePage from "./pages/NewsArticlePage";
import KebijakanPrivasi from "./pages/KebijakanPrivasi";
import SyaratLayanan from "./pages/SyaratLayanan";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardPage from "./pages/dashboard/DashboardPage";
import EventsPage from "./pages/dashboard/EventsPage";
import ProductsPage from "./pages/dashboard/ProductsPage";
import ProductsCreatePage from "./pages/dashboard/ProductsCreatePage";
import RecordingsPage from "./pages/dashboard/RecordingsPage";
import RecordingsCreatePage from "./pages/dashboard/RecordingsCreatePage";
import RecordingsDetailPage from "./pages/dashboard/RecordingsDetailPage";
import NewsPage from "./pages/dashboard/NewsPage";
import NewsCreatePage from "./pages/dashboard/NewsCreatePage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<ProductPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/products/:id" element={<ProductDetailPage />} />
            <Route path="/event" element={<EventPage />} />
            <Route path="/event/:id" element={<EventDetailPage />} />
            <Route path="/events/:id" element={<EventDetailPage />} />
            <Route path="/news" element={<NewsPublicPage />} />
            <Route path="/news/:slug" element={<NewsArticlePage />} />
            <Route path="/kebijakan-privasi" element={<KebijakanPrivasi />} />
            <Route path="/syarat-layanan" element={<SyaratLayanan />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/create" element={<ProductsCreatePage />} />
              <Route path="recordings" element={<RecordingsPage />} />
              <Route path="recordings/create" element={<RecordingsCreatePage />} />
              <Route path="recordings/:id" element={<RecordingsDetailPage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="news/create" element={<NewsCreatePage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
