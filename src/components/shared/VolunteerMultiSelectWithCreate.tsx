import { useState } from "react";
import { Plus, Check, ChevronDown, ChevronUp, HeartHandshake, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useUsers, CreateUserInput } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface VolunteerMultiSelectWithCreateProps {
  value: string[];
  onValueChange: (ids: string[]) => void;
  disabled?: boolean;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function VolunteerMultiSelectWithCreate({
  value,
  onValueChange,
  disabled = false,
  label = "Voluntários",
  icon,
  className,
}: VolunteerMultiSelectWithCreateProps) {
  const { users, createUser, isCreating } = useUsers();
  const { role } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const canCreate = role !== "viewer";
  
  // Filter only volunteers
  const volunteerUsers = users.filter(u => u.isVolunteer);

  const toggleVolunteer = (userId: string) => {
    if (value.includes(userId)) {
      onValueChange(value.filter(id => id !== userId));
    } else {
      onValueChange([...value, userId]);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    
    try {
      const input: CreateUserInput = {
        name: newName.trim(),
        phone: newPhone.trim(),
        role: "viewer",
        isVolunteer: true,
        canCreateEvents: false,
      };
      
      const result = await createUser(input);
      
      // Auto-select the newly created volunteer
      if (result?.user?.id) {
        onValueChange([...value, result.user.id]);
      }
      
      // Reset and close create popover
      setNewName("");
      setNewPhone("");
      setIsCreateOpen(false);
    } catch (error) {
      // Error is handled by the hook's onError
    }
  };

  const selectedVolunteers = users.filter(u => value.includes(u.id));

  return (
    <div className={cn("relative", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="w-full flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              {icon || <HeartHandshake className="w-4 h-4 text-muted-foreground" />}
              <span className="font-medium">{label}</span>
              {value.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {value.length} selecionado(s)
                </span>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        
        {/* Preview when collapsed */}
        {!isOpen && value.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedVolunteers.map(user => (
              <span
                key={user.id}
                className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full"
              >
                {user.name.split(' ')[0]}
              </span>
            ))}
          </div>
        )}
        
        <CollapsibleContent className="mt-2">
          <div className="space-y-2 bg-background rounded-lg border p-2">
            <p className="text-xs text-muted-foreground px-2">
              Selecione os voluntários que ajudarão neste evento:
            </p>
            
            {volunteerUsers.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {volunteerUsers.map((user) => {
                  const isSelected = value.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleVolunteer(user.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleVolunteer(user.id);
                        }
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleVolunteer(user.id)}
                      />
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-[10px] bg-amber-100 text-amber-700">
                          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </p>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum voluntário cadastrado.
              </p>
            )}
            
            {/* Create new volunteer option */}
            {canCreate && (
              <Popover open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 p-2 text-sm text-primary hover:bg-primary/5 rounded-md transition-colors border-t mt-2 pt-3"
                    onClick={() => setIsCreateOpen(true)}
                  >
                    <Plus className="w-4 h-4" />
                    Cadastrar novo voluntário...
                  </button>
                </PopoverTrigger>
                
                <PopoverContent 
                  className="w-80 p-4" 
                  align="start" 
                  side="bottom"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      <h4 className="font-medium">Novo Voluntário</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="volunteer-name">Nome *</Label>
                      <Input
                        id="volunteer-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Nome completo"
                        className="bg-muted/50 shadow-sm"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="volunteer-phone">Telefone *</Label>
                      <Input
                        id="volunteer-phone"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="bg-muted/50 shadow-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        O voluntário receberá acesso ao sistema via WhatsApp.
                      </p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsCreateOpen(false);
                          setNewName("");
                          setNewPhone("");
                        }}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreate}
                        disabled={!newName.trim() || !newPhone.trim() || isCreating}
                        className="flex-1"
                      >
                        {isCreating ? "Criando..." : "Cadastrar"}
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
