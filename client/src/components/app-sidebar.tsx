import { Home, Compass, Upload, Search } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const menuItems = [
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

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-sidebar-border hidden md:flex glass-dark">
      <SidebarContent className="pt-8">
        <SidebarGroup>
          <div className="px-6 mb-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-secondary bg-clip-text text-transparent animate-neon hover-lift">
              VidFlow
            </h1>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                      className="ripple-button hover-lift transition-all duration-300"
                    >
                      <Link href={item.url} className={`flex items-center gap-3 px-6 py-3 ${isActive ? 'neon-primary' : ''}`}>
                        <item.icon className={`w-6 h-6 transition-transform duration-300 ${isActive ? 'animate-bounceIn' : ''}`} />
                        <span className="text-base font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-center">
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
