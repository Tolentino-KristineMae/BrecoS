import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Printer, ArrowLeftRight, PanelLeftClose, PanelLeftOpen, Menu, LogOut } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout } from '../api/auth';
import brecoLogo from '../assets/Brecos-logo.png';

const navItems = [
  { to: '/',         label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bills',    label: 'Bills',     icon: FileText },
  { to: '/cash',     label: 'Cash',      icon: ArrowLeftRight },
  { to: '/print',    label: 'Print',     icon: Printer },
  { to: '/settings', label: 'Settings',  icon: Settings },
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const user = JSON.parse(localStorage.getItem('brecos_user') ?? '{}');

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      localStorage.removeItem('brecos_token');
      localStorage.removeItem('brecos_user');
      qc.clear();
      navigate('/login');
      toast.success('Logged out.');
    },
  });

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const currentPage = navItems.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )?.label ?? 'Dashboard';

  const desktopW = collapsed ? '72px' : '256px';

  const SidebarContent = ({ mobile = false }) => (
    <>
      {/* Logo */}
      <div
        className="relative flex items-center overflow-hidden flex-shrink-0"
        style={{
          background: '#ffffff',
          borderBottom: '1px solid rgba(226,232,240,0.8)',
          height: '80px', minHeight: '80px',
        }}
      >
        {!mobile && collapsed ? (
          <img src={brecoLogo} alt="Brecos" className="absolute object-contain"
            style={{ left: '10px', right: '10px', maxHeight: '40px', width: 'calc(100% - 20px)' }} />
        ) : (
          <img src={brecoLogo} alt="Brecos" className="absolute object-contain"
            style={{ left: '20px', right: '20px', maxHeight: '52px', width: 'calc(100% - 40px)' }} />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={!mobile && collapsed ? label : undefined}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                !mobile && collapsed ? 'justify-center px-0' : 'px-4'
              } ${
                isActive
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/30'
                  : 'text-blue-200/80 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="absolute left-0 w-1 rounded-r-full z-10"
                  style={{
                    height: isActive ? '28px' : '0px',
                    background: '#ffffff',
                    opacity: isActive ? 1 : 0,
                    transition: 'height 150ms ease, opacity 150ms ease',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
                <Icon size={18}
                  className={`flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-blue-300 group-hover:text-white'}`}
                />
                <span
                  className="overflow-hidden"
                  style={{
                    maxWidth: (!mobile && collapsed) ? '0px' : '160px',
                    opacity: (!mobile && collapsed) ? 0 : 1,
                    transition: 'max-width 220ms cubic-bezier(0.4,0,0.2,1), opacity 150ms ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout button - positioned above user info */}
      <div className="px-2 pb-2 flex-shrink-0">
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full group relative flex items-center gap-3 py-3 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap text-red-200/80 hover:bg-white/10 hover:text-red-300"
          style={{
            justifyContent: (!mobile && collapsed) ? 'center' : 'flex-start',
            padding: (!mobile && collapsed) ? '12px 0' : '12px 16px',
          }}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span
            className="overflow-hidden"
            style={{
              maxWidth: (!mobile && collapsed) ? '0px' : '160px',
              opacity: (!mobile && collapsed) ? 0 : 1,
              transition: 'max-width 220ms cubic-bezier(0.4,0,0.2,1), opacity 150ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            Logout
          </span>
        </button>
      </div>

      {/* Footer — user info only */}
      <div className="px-2 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div
          className="rounded-xl flex items-center overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            padding: (!mobile && collapsed) ? '8px 0' : '10px 12px',
            justifyContent: (!mobile && collapsed) ? 'center' : 'flex-start',
            gap: (!mobile && collapsed) ? '0' : '10px',
            transition: 'padding 220ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow">
            <span className="text-white text-xs font-bold">
              {user?.name?.[0]?.toUpperCase() ?? 'B'}
            </span>
          </div>

          {/* Name + version */}
          <div style={{
            flex: 1,
            maxWidth: (!mobile && collapsed) ? '0px' : '120px',
            opacity: (!mobile && collapsed) ? 0 : 1,
            overflow: 'hidden',
            transition: 'max-width 220ms cubic-bezier(0.4,0,0.2,1), opacity 150ms ease',
            whiteSpace: 'nowrap',
          }}>
            <p className="text-xs text-white/80 font-semibold leading-none truncate">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-blue-300/60 mt-0.5">{user?.email ?? 'Brecos System'}</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#f0f4ff' }}>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 h-full z-30"
        style={{
          width: desktopW,
          transition: 'width 220ms cubic-bezier(0.4,0,0.2,1)',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 40%, #1d4ed8 100%)',
          boxShadow: '4px 0 32px rgba(15,23,42,0.35)',
        }}
      >
        <SidebarContent mobile={false} />
      </aside>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <aside
        className="lg:hidden fixed top-0 left-0 h-full z-50 flex flex-col overflow-hidden"
        style={{
          width: '280px',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms cubic-bezier(0.4,0,0.2,1)',
          background: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 40%, #1d4ed8 100%)',
          boxShadow: '4px 0 32px rgba(15,23,42,0.35)',
        }}
      >
        <SidebarContent mobile={true} />
      </aside>

      {/* ── Main ── */}
      <main
        className="brecos-main flex-1 min-h-screen flex flex-col"
        style={{
          marginLeft: desktopW,
          transition: 'margin-left 220ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* On mobile, override the margin via a style tag */}
        <style>{`@media (max-width: 1023px) { .brecos-main { margin-left: 0 !important; } }`}</style>

        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between"
          style={{
            height: '60px',
            padding: '0 16px',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(226,232,240,0.8)',
            boxShadow: '0 1px 0 rgba(226,232,240,0.8), 0 4px 24px rgba(15,23,42,0.04)',
          }}
        >
          {/* Left */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
            >
              <Menu size={20} />
            </button>

            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>

            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-slate-400 font-medium hidden sm:inline">Brecos</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-slate-300 hidden sm:block">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-sm font-semibold text-slate-700">{currentPage}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Date badge - full date on all screens */}
            <div
              className="flex items-center px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-medium"
              style={{
                background: 'linear-gradient(135deg, #eff6ff, #eef2ff)',
                color: '#3730a3',
                border: '1px solid rgba(199,210,254,0.6)',
              }}
            >
              {new Date().toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-2 cursor-pointer group">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
              >
                {user?.name?.[0]?.toUpperCase() ?? 'B'}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold text-slate-700 leading-none">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Brecos System</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
