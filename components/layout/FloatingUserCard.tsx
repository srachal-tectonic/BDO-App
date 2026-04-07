'use client';

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface FloatingUserCardProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  onLogout: () => void;
}

/**
 * FloatingUserCard - A user card in the header top-right corner
 * showing user information with logout functionality
 */
export function FloatingUserCard({ user, onLogout }: FloatingUserCardProps) {
  const router = useRouter();

  const handleLogout = () => {
    onLogout();
  };

  const userName = user.name || user.email?.split('@')[0] || 'User';
  const userEmail = user.email || 'No email';
  const userAvatar = user.avatar || '';

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 hover:bg-accent transition-colors cursor-pointer">
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={userAvatar} alt={userName} />
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium leading-none">{userName}</p>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 pb-2 border-b">
            <Avatar className="h-10 w-10 rounded-lg">
              <AvatarImage src={userAvatar} alt={userName} />
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
