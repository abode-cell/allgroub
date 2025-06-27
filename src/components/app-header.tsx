'use client';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Notifications } from './notifications';
import { LogOut } from 'lucide-react';

export function AppHeader() {
    const { user, signOutUser } = useAuth();

    return (
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
            <div className="flex-1" />
            <div className="flex items-center gap-4">
                <Notifications />
                <div className="flex items-center gap-3">
                    <Avatar>
                         <AvatarImage data-ai-hint="profile picture" src={user?.photoURL ?? "https://placehold.co/40x40.png"} alt={user?.name ?? 'User'} />
                         <AvatarFallback>{user?.name?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col">
                        <span className="font-semibold text-sm">{user?.name}</span>
                        <span className="text-xs text-muted-foreground">{user?.email}</span>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={signOutUser} aria-label="Sign out">
                    <LogOut className="h-5 w-5" />
                </Button>
            </div>
        </header>
    );
}
