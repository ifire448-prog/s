import { Home, Compass, Upload, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Mobile Bottom Navigation Bar
 * Displayed only on mobile devices (hidden on desktop)
 */

const navItems = [
  {
    title: "For You",
    url: "/",
    icon: Home,
  },
  {
    title: "Explore",
    url: "/explore",
    icon: Compass,
  },
  {
    title: "Upload",
    url: "/upload",
    icon: Upload,
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass-dark border-t border-border neon-primary"
      data-testid="mobile-nav"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
          const Icon = item.icon;

          return (
            <Link key={item.url} href={item.url}>
              <motion.button
                whileTap={{ scale: 0.9 }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors relative",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`mobile-nav-${item.title.toLowerCase().replace(" ", "-")}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={cn("w-6 h-6 relative z-10", isActive && "fill-primary/20")} />
                <span className={cn("text-xs font-medium relative z-10", isActive && "font-semibold")}>
                  {item.title}
                </span>
              </motion.button>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
