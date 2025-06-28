'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useState } from 'react';

const Logo = () => (
    <Link href="/" className="flex items-center gap-2.5">
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-primary shrink-0"
    >
      <path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
      <path d="M12 11L7 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
      <path d="M12 11L17 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
      <path d="M8.5 18H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
    <div className="flex flex-col">
        <span className="font-bold text-base sm:text-lg text-foreground leading-tight">مجموعة عال | Aal Group</span>
        <span className="text-xs text-muted-foreground leading-tight hidden sm:block">إدارة, تمويل, تطوير ,وأكثر...</span>
    </div>
  </Link>
);


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


export function AppHeader() {
  const { user, role, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuItems = allMenuItems.filter((item) => role && item.roles.includes(role));

  const getInitials = (name: string) => {
      const names = name.split(' ');
      if (names.length > 1 && names[1]) {
          return `${names[0][0]}${names[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur-md">
      <div className="flex h-20 items-center px-4 md:px-6">
        {/* DESKTOP VIEW */}
        <div className="hidden w-full items-center justify-between md:flex">
            <div className="flex-1">
                <Logo />
            </div>
            
            <div className="flex-none">
                <NavLinks menuItems={menuItems} />
            </div>

            <div className="flex flex-1 items-center justify-end gap-4">
                <Notifications />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-3 h-auto py-2 px-3">
                            <div className="text-right">
                                <p className="font-semibold text-sm">{user?.name}</p>
                                <p className="text-xs text-muted-foreground">{user?.role}</p>
                            </div>
                            <Avatar className="h-14 w-14 border-0 bg-transparent">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary h-10 w-10 m-auto"><path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 11L7 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 11L17 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M8.5 18H15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
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
                      <Logo />
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
            
            <Logo />
            
            <div className="flex items-center gap-2">
                <Notifications />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" className="relative h-14 w-14 rounded-full p-0">
                             <Avatar className="h-14 w-14 border-0 bg-transparent">
                                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary h-9 w-9 m-auto"><path d="M12 2L2 22H22L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 11L7 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M12 11L17 22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path><path d="M8.5 18H15.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                             </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user?.email}
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
