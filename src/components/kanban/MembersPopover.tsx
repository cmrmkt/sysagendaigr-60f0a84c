import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface MembersPopoverProps {
  children: React.ReactNode;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

const MembersPopover = ({ 
  children, 
  selectedIds, 
  onSelectionChange 
}: MembersPopoverProps) => {
  const { users } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const responsibleUsers = users.filter(u => u.canCreateEvents);
  const filteredUsers = responsibleUsers.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggleMember = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter(id => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 pointer-events-auto" align="start">
        <div className="p-3 space-y-3">
          <h4 className="font-medium text-center">Membros</h4>
          
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar membros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {filteredUsers.map((user) => {
              const isSelected = selectedIds.includes(user.id);
              return (
                <button
                  key={user.id}
                  onClick={() => toggleMember(user.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors",
                    "hover:bg-muted",
                    isSelected && "bg-primary/10"
                  )}
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum membro encontrado
              </p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MembersPopover;