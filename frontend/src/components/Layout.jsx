import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Printer, ArrowLeftRight, PanelLeftClose, PanelLeftOpen, Menu, LogOut, X, ChevronRight, CalendarDays } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { logout } from '../api/auth';
import brecoLogo from '../assets/Brecos-logo.png';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/bills', label: 'Bills', icon: FileText },
  { to: '/cash', label: 'Cash', icon: ArrowLeftRight },
  { to: '/print', label: 'Print', icon: Printer },
  { to: '/settings', label: 'Settings', icon: Settings },
];

function SidebarContent({ collapsed, user, onNavigate, onLogout, pending, onClose }) {
  return (
    <>
      <div className="sidebar-brand">
        <NavLink to="/" onClick={onNavigate} aria-label="Brecos dashboard">
          <img src={brecoLogo} alt="Brecos" />
        </NavLink>
        {onClose && <button className="icon-control" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>}
      </div>
      <nav aria-label="Main navigation" className="sidebar-navigation">
        <p className="sidebar-caption" aria-hidden="true">{collapsed ? '•••' : 'WORKSPACE'}</p>
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} onClick={onNavigate}
            title={collapsed ? label : undefined} aria-label={collapsed ? label : undefined}
            className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}>
            <Icon size={19} strokeWidth={1.8} />
            {!collapsed && <><span>{label}</span><ChevronRight className="sidebar-chevron" size={14} /></>}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={onLogout} disabled={pending} className="sidebar-link sidebar-logout" aria-label="Log out" title={collapsed ? 'Log out' : undefined}>
          <LogOut size={18} />{!collapsed && <span>{pending ? 'Logging out…' : 'Log out'}</span>}
        </button>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? 'B'}</div>
          {!collapsed && <div className="min-w-0"><p className="text-sm font-semibold truncate">{user?.name ?? 'Admin'}</p><p className="text-xs text-blue-200/80 truncate">{user?.email ?? 'Brecos System'}</p></div>}
        </div>
      </div>
    </>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef(null);
  const menuRef = useRef(null);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const menuButton = menuRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = drawerRef.current;
    const focusFrame = requestAnimationFrame(() => drawer.querySelector('button')?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
      if (event.key !== 'Tab') return;
      const elements = [...drawer.querySelectorAll('a, button:not(:disabled)')];
      const first = elements[0];
      const last = elements.at(-1);
      if (!drawer.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    const desktop = window.matchMedia('(min-width: 1024px)');
    const onResize = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener('change', onResize);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', onResize);
      menuButton?.focus();
    };
  }, [mobileOpen]);

  const currentPage = navItems.find(n => n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to))?.label ?? 'Dashboard';
  const sidebarProps = { user, onLogout: () => logoutMutation.mutate(), pending: logoutMutation.isPending };

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a href="#page-content" className="skip-link">Skip to content</a>
      <aside className="desktop-sidebar"><SidebarContent {...sidebarProps} collapsed={collapsed} /></aside>
      {mobileOpen && <div className="drawer-backdrop" onClick={() => setMobileOpen(false)} />}
      <aside ref={drawerRef} id="mobile-navigation" className={`mobile-sidebar ${mobileOpen ? 'is-open' : ''}`}
        role="dialog" aria-modal={mobileOpen ? true : undefined} aria-label="Navigation" inert={!mobileOpen}>
        <SidebarContent {...sidebarProps} onNavigate={() => setMobileOpen(false)} onClose={() => setMobileOpen(false)} />
      </aside>
      <main className="brecos-main" inert={mobileOpen}>
        <header className="app-header">
          <div className="flex items-center gap-3 min-w-0">
            <button ref={menuRef} onClick={() => setMobileOpen(true)} className="icon-control lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-navigation"><Menu size={20} /></button>
            <button onClick={() => setCollapsed(c => !c)} className="icon-control hidden lg:flex" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
            <div className="header-breadcrumb"><span className="hidden sm:inline">Workspace</span><ChevronRight size={14} className="hidden sm:block" /><span aria-current="page">{currentPage}</span></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="header-date"><CalendarDays size={15} /><span>{new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span></div>
            <div className="header-user"><div className="user-avatar">{user?.name?.[0]?.toUpperCase() ?? 'B'}</div><span className="hidden md:inline text-sm font-semibold text-slate-700 max-w-32 truncate">{user?.name ?? 'Admin'}</span></div>
          </div>
        </header>
        <div id="page-content" tabIndex={-1} className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
