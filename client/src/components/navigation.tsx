import { Link, useLocation } from "wouter";
import { Home, Settings, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandSignature } from "./brand-signature";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/settings", label: "Brand Settings", icon: Settings },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Key className="h-6 w-6 text-primary" />
              <span className="font-bold text-lg">Review Rocket</span>
            </Link>
            
            <div className="flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                      isActive 
                        ? "text-primary border-b-2 border-primary pb-2" 
                        : "text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Brand signature positioned on the right */}
          <div className="flex items-center">
            <BrandSignature />
          </div>
        </div>
      </div>
    </nav>
  );
}