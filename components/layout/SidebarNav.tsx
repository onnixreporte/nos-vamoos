"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Users,
  MapPin,
  MessageSquare,
  GitCompareArrows,
} from "lucide-react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "General",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Ventas",
    href: "/ventas",
    icon: DollarSign,
  },
  {
    title: "Agentes",
    href: "/agentes",
    icon: Users,
  },
  {
    title: "Destinos",
    href: "/destinos",
    icon: MapPin,
  },
  {
    title: "Conversaciones",
    href: "/conversaciones",
    icon: MessageSquare,
  },
  {
    title: "Comparación",
    href: "/comparacion",
    icon: GitCompareArrows,
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <SidebarMenu className="gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              tooltip={item.title}
              className="transition-all duration-200"
            >
              <Link href={item.href}>
                <Icon className="size-4" />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
