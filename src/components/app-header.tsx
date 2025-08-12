
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDataState } from '@/contexts/data-context';
import { Button } from './ui/button';
import { Notifications } from './notifications';
import { LogOut, Menu, User } from 'lucide-react';
import { allMenuItems, type MenuItem } from './main-nav';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useState } from 'react';
import { ThemeToggle } from './theme-toggle';
import { Logo } from './logo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';


function NavLinks({ menuItems }: { menuItems: MenuItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex items-center gap-1 lg:gap-2">
      {menuItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'px-3 lg:px-4 py-2 text-sm lg:text-base font-semibold transition-colors rounded-md',
            pathname.startsWith(item.href) && item.href !== '/' || pathname === item.href
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-primary/90'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

const UserMenuIcon = ({ userName }: { userName: string }) => (
    <Avatar className="h-10 w-10 border-2 border-primary/20">
      <AvatarFallback className="bg-primary/10 text-primary font-bold">
        {getInitials(userName)}
      </AvatarFallback>
    </Avatar>
);


export function AppHeader() {
  const { currentUser, signOutUser } = useDataState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const role = currentUser?.role;

  const menuItems = allMenuItems.filter((item) => {
    if (!role || !item.roles.includes(role)) {
      return false;
    }
    // If a permission is required for this menu item...
    if (item.permission) {
      // For assistants, check if they have the specific permission.
      if (role === 'مساعد مدير المكتب') {
        return currentUser?.permissions?.[item.permission];
      }
    }
    // For other roles or items without a specific permission, show if role matches.
    return true;
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-md">
      <div className="flex h-20 items-center px-4 md:px-6">
        {/* DESKTOP VIEW */}
        <div className="hidden w-full items-center justify-between md:flex">
            <div className="flex-1">
                 <Link href="/dashboard" className="flex items-center gap-2.5">
                    <Logo />
                </Link>
            </div>
            
            <div className="flex-none">
                <NavLinks menuItems={menuItems} />
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
                <ThemeToggle />
                <Notifications />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-3 h-auto p-1.5">
                            <div className="text-right">
                                <p className="font-semibold text-sm">{currentUser?.name}</p>
                                <p className="text-xs text-muted-foreground">{currentUser?.role}</p>
                            </div>
                            <UserMenuIcon userName={currentUser?.name || ''} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {currentUser?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                           <Link href="/profile">
                                <User className="ml-2 h-4 w-4" />
                                <span>الملف الشخصي</span>
                           </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* MOBILE VIEW */}
        <div className="flex w-full items-center justify-between md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">فتح القائمة</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0">
                  <div className="p-4 border-b">
                      <Link href="/dashboard" className="flex items-center gap-2.5">
                          <Logo />
                      </Link>
                  </div>
                  <nav className="mt-4 flex flex-col gap-1 p-2">
                      {menuItems.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      ))}
                  </nav>
              </SheetContent>
            </Sheet>
            
            <Link href="/dashboard" className="flex items-center gap-2.5">
                <Logo />
            </Link>
            
            <div className="flex items-center gap-1">
                <ThemeToggle />
                <Notifications />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                            <UserMenuIcon userName={currentUser?.name || ''} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{currentUser?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {currentUser?.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/profile">
                                <User className="ml-2 h-4 w-4" />
                                <span>الملف الشخصي</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOutUser} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                            <LogOut className="ml-2 h-4 w-4" />
                            <span>تسجيل الخروج</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </div>
    </header>
  );
}
