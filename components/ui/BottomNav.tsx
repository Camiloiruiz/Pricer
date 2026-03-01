/**
 * components/ui/BottomNav.tsx
 * Fixed mobile bottom navigation bar.
 */
"use client";

type Tab = "home" | "search" | "submit" | "admin";

const NAV_ITEMS: { tab: Tab; label: string; href: string; icon: string }[] = [
  { tab: "home",   label: "Home",   href: "/",       icon: "🏠" },
  { tab: "search", label: "Search", href: "/?focus=search", icon: "🔍" },
  { tab: "submit", label: "Submit", href: "/submit", icon: "📷" },
  { tab: "admin",  label: "Admin",  href: "/admin",  icon: "🛡" },
];

export default function BottomNav({ active }: { active: Tab }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 pb-safe"
      aria-label="Main navigation"
    >
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ tab, label, href, icon }) => {
          const isActive = tab === active;
          return (
            <a
              key={tab}
              href={href}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 text-xs font-medium
                transition-colors touch-manipulation
                ${isActive ? "text-brand-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              <span className="text-xl leading-none" aria-hidden>{icon}</span>
              <span>{label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-brand-600 rounded-t-full" aria-hidden />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
