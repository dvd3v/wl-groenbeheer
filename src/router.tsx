import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/app-shell";
import { DatamodelPage } from "./pages/datamodel-page";
import { JaarplanPage } from "./pages/jaarplan-page";
import { MapTrajectControlePage } from "./pages/map-traject-controle-page";
import { MapPage } from "./pages/map-page";
import { arcgisAuthService } from "./services/arcgis-auth-service";
import { arcgisJaarplanService } from "./services/arcgis-jaarplan-service";
import { arcgisTrajectService } from "./services/arcgis-traject-service";
import { mockPlanningService } from "./services/mock-planning-service";
import { useAppStore } from "./store/app-store";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="glass-panel rounded-card px-6 py-5 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accentStrong">
          WL Groenbeheer
        </div>
        <div className="mt-2 text-[13px] text-text">{message}</div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4">
      <div className="glass-panel max-w-xl rounded-card p-6">
        <div className="text-[14px] font-semibold text-danger">
          Applicatie kon niet starten
        </div>
        <p className="mt-3 text-[12px] leading-6 text-textDim">{message}</p>
      </div>
    </div>
  );
}

function ProtectedApp() {
  const setBootstrapData = useAppStore((state) => state.setBootstrapData);
  const setJaarplanBootstrapData = useAppStore((state) => state.setJaarplanBootstrapData);
  const setJaarplanLoading = useAppStore((state) => state.setJaarplanLoading);
  const setJaarplanError = useAppStore((state) => state.setJaarplanError);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        await arcgisAuthService.ensureSignedIn();
        setJaarplanLoading(true);
        setJaarplanError(null);

        const jaarplanBootstrapPromise = arcgisJaarplanService.loadBootstrap();
        const trajecten = await arcgisTrajectService.queryAllTrajecten();
        const planningItems = await mockPlanningService.getAll(trajecten);

        if (cancelled) {
          return;
        }

        setBootstrapData(trajecten, planningItems);
        setState("ready");

        void jaarplanBootstrapPromise
          .then((jaarplanBootstrap) => {
            if (cancelled) {
              return;
            }

            setJaarplanBootstrapData(
              jaarplanBootstrap.trajecten,
              jaarplanBootstrap.measures,
              jaarplanBootstrap.metadata
            );
          })
          .catch((jaarplanError) => {
            if (cancelled) {
              return;
            }

            setJaarplanError(
              jaarplanError instanceof Error
                ? jaarplanError.message
                : "Onbekende fout tijdens laden van het jaarplan."
            );
            setJaarplanLoading(false);
          });
      } catch (bootstrapError) {
        if (cancelled) {
          return;
        }

        setError(
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Onbekende fout tijdens initialisatie."
        );
        setState("error");
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    setBootstrapData,
    setJaarplanBootstrapData,
    setJaarplanError,
    setJaarplanLoading,
  ]);

  if (state === "loading") {
    return <LoadingScreen message="ArcGIS sessie en controlekaart laden..." />;
  }

  if (state === "error") {
    return <ErrorScreen message={error ?? "Onbekende fout"} />;
  }

  return <AppShell />;
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<ProtectedApp />}>
        <Route path="/" element={<Navigate to="/map-traject-controle" replace />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/map-traject-controle" element={<MapTrajectControlePage />} />
        <Route path="/jaarplan" element={<JaarplanPage />} />
        <Route path="/datamodel" element={<DatamodelPage />} />
      </Route>
    </Routes>
  );
}
