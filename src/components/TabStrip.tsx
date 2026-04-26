import { NavLink, useSearchParams } from "react-router-dom";
import { TAB_SOURCES, TabKey } from "../data/sources";
import {
  DollarSign,
  Home,
  ListOrdered,
  Mail,
  MapPin,
  Phone,
  Route,
  UserCircle,
} from "lucide-react";

const ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  dashboard: Home,
  clock: DollarSign,
  account: UserCircle,
  seniority: ListOrdered,
  routes: Route,
  onCallToledo: Phone,
  onCallNbl: Phone,
  locations: MapPin,
  contact: Mail,
};

export function TabStrip() {
  const [params] = useSearchParams();
  const current = (params.get("tab") as TabKey) || "dashboard";

  return (
    <nav
      className="sticky top-14 z-20 backdrop-blur-xl"
      style={{ background: "rgb(var(--bg-base) / 0.55)" }}
    >
      <div className="max-w-[1600px] mx-auto px-3 sm:px-5 border-b" style={{ borderColor: "rgb(var(--border) / 0.06)" }}>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-2 px-2 py-2.5">
          {TAB_SOURCES.map((tab) => {
            const Icon = ICONS[tab.key];
            const active = current === tab.key;
            return (
              <NavLink
                key={tab.key}
                to={`/?tab=${tab.key}`}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full whitespace-nowrap text-sm font-medium transition-all ${
                  active
                    ? "bg-amber-500/20 text-amber-200 shadow-lg shadow-amber-500/10"
                    : ""
                }`}
                style={{
                  color: active ? undefined : "rgb(var(--fg-subtle))",
                  border: active
                    ? "1px solid rgb(245 158 11 / 0.35)"
                    : "1px solid rgb(var(--border) / 0.08)",
                  background: active
                    ? undefined
                    : "rgb(var(--bg-raised) / 0.3)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.shortLabel}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
