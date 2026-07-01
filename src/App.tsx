import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, lazy } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Home } from './pages/Home';
import { Register } from './pages/Register';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { Profile } from './pages/Profile';
import { Favorites } from './pages/Favorites';
import { ContactUs } from './pages/ContactUs';
import { FAQ } from './pages/FAQ';
import { AboutUs } from './pages/AboutUs';
import { NotFound } from './pages/NotFound';
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminRoute } from './components/AdminRoute';
import { ToastContainer } from './components/Toast';

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts').then(m => ({ default: m.AdminProducts })));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders').then(m => ({ default: m.AdminOrders })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminBanners = lazy(() => import('./pages/admin/AdminBanners').then(m => ({ default: m.AdminBanners })));
const AdminDelivery = lazy(() => import('./pages/admin/AdminDelivery').then(m => ({ default: m.AdminDelivery })));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons').then(m => ({ default: m.AdminCoupons })));
const AdminReturns = lazy(() => import('./pages/admin/AdminReturns').then(m => ({ default: m.AdminReturns })));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog').then(m => ({ default: m.AdminAuditLog })));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews').then(m => ({ default: m.AdminReviews })));
const AdminCollections = lazy(() => import('./pages/admin/AdminCollections').then(m => ({ default: m.AdminCollections })));
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm').then(m => ({ default: m.AdminProductForm })));

const AdminLoading = () => (
  <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-surface-400 font-medium">Загрузка...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<AdminLoading />}>
          <Routes>
          {/* Public shop routes */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<AboutUs />} />

          {/* Admin login — public */}
          <Route path="/admin" element={<AdminLogin />} />

          {/* Protected admin routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <AdminRoute requiredRole="seller">
                <AdminProducts />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/new"
            element={
              <AdminRoute requiredRole="seller">
                <AdminProductForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/products/:id/edit"
            element={
              <AdminRoute requiredRole="seller">
                <AdminProductForm />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AdminRoute requiredRole="manager">
                <AdminOrders />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute requiredRole="admin">
                <AdminUsers />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/banners"
            element={
              <AdminRoute requiredRole="manager">
                <AdminBanners />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <AdminRoute requiredRole="seller">
                <AdminCategories />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reviews"
            element={
              <AdminRoute requiredRole="manager">
                <AdminReviews />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/collections"
            element={
              <AdminRoute requiredRole="seller">
                <AdminCollections />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/delivery"
            element={
              <AdminRoute requiredRole="manager">
                <AdminDelivery />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/coupons"
            element={
              <AdminRoute requiredRole="manager">
                <AdminCoupons />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/returns"
            element={
              <AdminRoute requiredRole="manager">
                <AdminReturns />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/audit"
            element={
              <AdminRoute requiredRole="admin">
                <AdminAuditLog />
              </AdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        <ToastContainer />
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
