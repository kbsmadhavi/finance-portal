import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  BarChart3,
  Menu,
  Wallet,
} from "lucide-react";
import { Dashboard } from "@/pages/Dashboard";
import { Transactions } from "@/pages/Transactions";
import { Budgets } from "@/pages/Budgets";
import { Analytics } from "@/pages/Analytics";

type Page = "dashboard" | "transactions" | "budgets" | "analytics";

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: "transactions", label: "Transactions", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { id: "budgets", label: "Budgets", icon: <PiggyBank className="h-4 w-4" /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
];

function NavContent({
  activePage,
  onNavigate,
}: {
  activePage: Page;
  onNavigate: (page: Page) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Button
          key={item.id}
          variant={activePage === item.id ? "secondary" : "ghost"}
          className="justify-start gap-3"
          onClick={() => onNavigate(item.id)}
        >
          {item.icon}
          {item.label}
        </Button>
      ))}
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (page: Page) => {
    setActivePage(page);
    setMobileOpen(false);
  };

  const renderPage = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "transactions":
        return <Transactions />;
      case "budgets":
        return <Budgets />;
      case "analytics":
        return <Analytics />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4 gap-4">
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 pt-10">
              <div className="flex items-center gap-2 px-2 mb-6">
                <Wallet className="h-6 w-6 text-primary" />
                <span className="text-lg font-bold">FinanceHub</span>
              </div>
              <NavContent activePage={activePage} onNavigate={handleNavigate} />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold hidden sm:inline">FinanceHub</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={activePage === item.id ? "secondary" : "ghost"}
                size="sm"
                className="gap-2"
                onClick={() => setActivePage(item.id)}
              >
                {item.icon}
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 max-w-7xl">
        {renderPage()}
      </main>
    </div>
  );
}

export default App
