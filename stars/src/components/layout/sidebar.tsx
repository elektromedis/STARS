import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";

/** Sidebar desktop (lg: penuh) dan tablet (md: rail ikon). Disembunyikan di mobile. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[72px] flex-col bg-navy-800 text-white md:flex lg:w-64">
      <div className="flex h-16 items-center justify-center border-b border-white/10 px-3 lg:justify-start lg:px-5">
        <Logo className="lg:hidden" showText={false} />
        <Logo className="hidden lg:flex" />
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav compact />
      </div>
      <div className="hidden border-t border-white/10 p-4 text-xs text-navy-300 lg:block">
        <p className="font-medium text-navy-100">STARS • RSUD Cipayung</p>
      </div>
    </aside>
  );
}
