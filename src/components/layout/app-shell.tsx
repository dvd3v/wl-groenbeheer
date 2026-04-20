import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { cn } from "../../lib/cn";
import { arcgisAuthService } from "../../services/arcgis-auth-service";
import { Button } from "../ui/button";

const logoUrl = `${import.meta.env.BASE_URL}wl-logo.png`;

const NAV_ITEMS = [
  { to: "/map-traject-controle", label: "Kaart Traject Controle" },
  { to: "/map", label: "Kaart" },
  { to: "/jaarplan", label: "Jaarplan" },
  { to: "/datamodel", label: "Datamodel" },
];
export function AppShell() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogout() {
    setIsLoggingOut(true);
    arcgisAuthService.signOut();
    window.location.reload();
  }

  return (
    <div className="flex h-screen flex-col bg-transparent">
      <header className="border-x-0 border-t-0 px-3 pt-3 md:px-4">
        <div className="glass-panel rounded-[22px] px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/80 bg-white shadow-soft">
                <img src={logoUrl} alt="Waterschap Limburg" className="h-7 w-auto" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accentStrong">
                  Waterschap Limburg
                </div>
                <div className="mt-1 text-[15px] font-semibold text-text">
                  Groenbeheer GIS Workspace
                </div>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1 rounded-[16px] border border-white/70 bg-surfaceAlt/80 p-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-[12px] px-3 py-2 text-[11.5px] font-medium transition",
                      isActive
                        ? "bg-white text-accentStrong shadow-soft"
                        : "text-textMuted hover:bg-white/70 hover:text-text"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden rounded-pill border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-700 md:block">
                ArcGIS Online verbonden
              </div>
              <Button
                variant="outline"
                className="px-3 py-1 text-[11px]"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Uitloggen..." : "Uitloggen"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 px-3 pb-3 pt-3 md:px-4">
        <Outlet />
      </main>
    </div>
  );
}
