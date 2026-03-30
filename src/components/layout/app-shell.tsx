import { Outlet, NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";

const logoUrl = `${import.meta.env.BASE_URL}wl-logo.png`;

const NAV_ITEMS = [
  { to: "/map", label: "Kaart" },
  { to: "/jaarplan", label: "Jaarplan" },
  { to: "/datamodel", label: "Datamodel" },
];
export function AppShell() {
  return (
    <div className="flex h-screen flex-col">
      <header className="glass-panel border-x-0 border-t-0">
        <div className="flex h-[52px] items-center justify-between px-4 md:px-[18px]">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Waterschap Limburg" className="h-7 w-auto" />
            <div>
              <div className="text-[13px] font-semibold text-text">
                Groenbeheer Kaartlagen
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-md bg-surfaceAlt p-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-[11.5px] font-medium transition",
                    isActive
                      ? "bg-white text-accentStrong shadow-soft"
                      : "text-textMuted hover:text-text"
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden rounded-pill border border-accent/20 bg-accentSoft px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accentStrong md:block">
            WL ArcGIS Online
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
