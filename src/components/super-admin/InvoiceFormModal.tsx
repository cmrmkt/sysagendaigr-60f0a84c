import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useOrganizations } from "@/hooks/useOrganizations";

const invoiceSchema = z.object({
  organization_id: z.string().min(1, "Selecione uma organização"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  reference_month: z.string().min(1, "Selecione o mês de referência"),
  due_date: z.string().min(1, "Informe a data de vencimento"),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: InvoiceFormData & { status: string }) => void;
  isLoading?: boolean;
  defaultOrganizationId?: string;
}

const InvoiceFormModal = ({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  defaultOrganizationId,
}: InvoiceFormModalProps) => {
  const { data: organizations } = useOrganizations();
  
  // Generate reference month options (current + next 12 months)
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const date = addMonths(startOfMonth(new Date()), i);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "MMMM/yyyy", { locale: ptBR }),
    };
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      organization_id: defaultOrganizationId || "",
      amount: 0,
      reference_month: monthOptions[1]?.value || "",
      due_date: "",
      description: "",
      notes: "",
    },
  });

  // Find selected organization to auto-fill amount
  const selectedOrgId = form.watch("organization_id");
  const selectedReferenceMonth = form.watch("reference_month");
  const selectedOrg = organizations?.find((o) => o.id === selectedOrgId);

  // Calculate due date based on reference month and billing day
  const calculateDueDate = (refMonth: string, billingDay: number) => {
    if (!refMonth) return "";
    const refDate = parseISO(refMonth);
    const dueDate = new Date(refDate.getFullYear(), refDate.getMonth(), billingDay);
    return format(dueDate, "yyyy-MM-dd");
  };

  // Auto-fill amount and due date when organization or reference month changes
  useEffect(() => {
    if (selectedOrg?.subscription_amount) {
      const currentAmount = form.getValues("amount");
      if (!currentAmount || currentAmount === 0) {
        form.setValue("amount", selectedOrg.subscription_amount);
      }
    }
    
    // Auto-set due date based on billing day and reference month
    if (selectedOrg?.billing_day && selectedReferenceMonth) {
      const dueDate = calculateDueDate(selectedReferenceMonth, selectedOrg.billing_day);
      form.setValue("due_date", dueDate);
    }
  }, [selectedOrgId, selectedOrg, selectedReferenceMonth, form]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const defaultRefMonth = monthOptions[1]?.value || "";
      const defaultOrg = defaultOrganizationId 
        ? organizations?.find((o) => o.id === defaultOrganizationId)
        : null;
      
      // Calculate initial due date
      let initialDueDate = "";
      if (defaultOrg?.billing_day && defaultRefMonth) {
        initialDueDate = calculateDueDate(defaultRefMonth, defaultOrg.billing_day);
      }
      
      form.reset({
        organization_id: defaultOrganizationId || "",
        amount: defaultOrg?.subscription_amount || 0,
        reference_month: defaultRefMonth,
        due_date: initialDueDate,
        description: "",
        notes: "",
      });
    }
  }, [open, defaultOrganizationId, organizations]);

  const handleSubmit = (data: InvoiceFormData) => {
    onSubmit({
      ...data,
      status: "pending",
    });
  };

  // Filter only active organizations
  const activeOrganizations = organizations?.filter(
    (org) => org.status === "active" || org.status === "pending"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6">

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="organization_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organização</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 shadow-sm">
                          <SelectValue placeholder="Selecione a organização" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeOrganizations?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Referência</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted/50 shadow-sm">
                          <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {monthOptions.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor (R$)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          className="bg-muted/50 shadow-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" className="bg-muted/50 shadow-sm" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Mensalidade do plano básico"
                        className="bg-muted/50 shadow-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas internas sobre esta fatura..."
                        className="bg-muted/50 shadow-sm min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Fatura"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceFormModal;
