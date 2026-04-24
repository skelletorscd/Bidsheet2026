import { NavLink, useSearchParams } from "react-router-dom";
import { TAB_SOURCES, TabKey } from "../data/sources";
import {
  Home,
  ListOrdered,
  Mail,
  MapPin,
  Phone,
  ScrollText,
} from "lucide-react";

const ICONS: Record<TabKey, React.ComponentType<{ className?: string }>> = {
  dashboard: Home,
  seniority: ListOrdered,
  bidSheet: ScrollText,
  onCallToledo: Phone,
  onCallNbl: Phone,
  locations: MapPin,
  contact: Mail,
};

export function TabStrip() {
  const [params] = useSearchParams();
  const current = (params.get("tab") as TabKey) || "dashboard";

  return (
    <nav className="bg-bg-panel border-b border-border-subtle">
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-2 px-2 py-2">
          {TAB_SOURCES.map((tab) => {
            const Icon = ICONS[tab.key];
            const active = current === tab.key;
            return (
              <NavLink
                key={tab.key}
                to={`/?tab=${tab.key}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap text-sm font-medium transition-colors border ${
                  active
                    ? "bg-amber-500/15 border-amber-500/30 text-amber-200"
                    : "border-transparent text-slate-300 hover:bg-bg-hover hover:text-slate-100"
                }`}
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
