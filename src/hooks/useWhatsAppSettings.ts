import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useCallback } from "react";

export interface WhatsAppSettings {
  evolution_api_url: string;
  evolution_api_key: string;
  evolution_instance_name: string;
  whatsapp_connected: boolean;
  whatsapp_connected_at: string | null;
  whatsapp_phone_number: string | null;
}

export interface WhatsAppConnectionStatus {
  connected: boolean;
  state: string;
  phoneNumber?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface QRCodeData {
  qrcode: string;
  code?: string;
  instanceName: string;
}

const DEFAULT_WHATSAPP_SETTINGS: WhatsAppSettings = {
  evolution_api_url: "",
  evolution_api_key: "",
  evolution_instance_name: "",
  whatsapp_connected: false,
  whatsapp_connected_at: null,
  whatsapp_phone_number: null,
};

export const useWhatsAppSettings = () => {
  const { effectiveOrganization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current settings
  const query = useQuery({
    queryKey: ["whatsappSettings", effectiveOrganization?.id],
    queryFn: async () => {
      if (!effectiveOrganization?.id) return DEFAULT_WHATSAPP_SETTINGS;

      // Only read non-sensitive fields; credentials are managed server-side via edge functions
      const { data, error } = await (supabase as any)
        .from("organizations_safe")
        .select("whatsapp_connected, whatsapp_connected_at, whatsapp_phone_number")
        .eq("id", effectiveOrganization.id)
        .single();

      if (error) throw error;

      return {
        evolution_api_url: "",
        evolution_api_key: "",
        evolution_instance_name: "",
        whatsapp_connected: (data as any)?.whatsapp_connected || false,
        whatsapp_connected_at: (data as any)?.whatsapp_connected_at || null,
        whatsapp_phone_number: (data as any)?.whatsapp_phone_number || null,
      };
    },
    enabled: !!effectiveOrganization?.id,
  });

  // Create instance and get QR code
  const createInstanceMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("create-whatsapp-instance", {
        body: { organization_id: effectiveOrganization.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.connected) {
        // Already connected
        return { connected: true, instanceName: data.instanceName };
      }
      
      return data as QRCodeData;
    },
    onSuccess: (data) => {
      if ('connected' in data && data.connected) {
        queryClient.invalidateQueries({ queryKey: ["whatsappSettings"] });
        toast({
          title: "WhatsApp conectado!",
          description: "Sua conexão já estava ativa.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar instância",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get QR code for existing instance
  const getQRCodeMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("get-whatsapp-qrcode", {
        body: { organization_id: effectiveOrganization.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      if (data.connected) {
        return { connected: true };
      }
      
      return data;
    },
    onSuccess: (data) => {
      if ('connected' in data && data.connected) {
        queryClient.invalidateQueries({ queryKey: ["whatsappSettings"] });
        toast({
          title: "WhatsApp conectado!",
          description: "Conexão detectada com sucesso.",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao obter QR Code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Check connection status
  const checkStatusMutation = useMutation({
    mutationFn: async (): Promise<WhatsAppConnectionStatus> => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("check-whatsapp-status", {
        body: { organization_id: effectiveOrganization.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as WhatsAppConnectionStatus;
    },
    onSuccess: (data) => {
      if (data.connected) {
        queryClient.invalidateQueries({ queryKey: ["whatsappSettings"] });
      }
    },
  });

  // Disconnect WhatsApp
  const disconnectMutation = useMutation({
    mutationFn: async (deleteInstance: boolean = false) => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("disconnect-whatsapp", {
        body: { 
          organization_id: effectiveOrganization.id,
          delete_instance: deleteInstance 
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsappSettings"] });
      toast({
        title: "WhatsApp desconectado",
        description: data.message || "Conexão encerrada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao desconectar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test existing connection (legacy)
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveOrganization?.id) throw new Error("No organization");

      const { data, error } = await supabase.functions.invoke("test-whatsapp-connection", {
        body: { organization_id: effectiveOrganization.id },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message || "Falha na conexão");
      
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão bem-sucedida!",
        description: data.message || "A instância WhatsApp está conectada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro na conexão",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start polling for connection status
  const startPolling = useCallback((intervalMs: number = 3000) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const status = await checkStatusMutation.mutateAsync();
        if (status.connected) {
          stopPolling();
          toast({
            title: "WhatsApp conectado!",
            description: `Número: ${status.phoneNumber || "detectado"}`,
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, intervalMs);
  }, [checkStatusMutation, toast]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  const isConfigured = Boolean(
    query.data?.evolution_api_url &&
    query.data?.evolution_api_key &&
    query.data?.evolution_instance_name
  );

  const isConnected = query.data?.whatsapp_connected || false;

  return {
    settings: query.data || DEFAULT_WHATSAPP_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
    isConfigured,
    isConnected,
    
    // Create instance and get QR
    createInstance: createInstanceMutation.mutateAsync,
    isCreatingInstance: createInstanceMutation.isPending,
    qrCodeData: createInstanceMutation.data as QRCodeData | undefined,
    
    // Get new QR code
    refreshQRCode: getQRCodeMutation.mutateAsync,
    isRefreshingQR: getQRCodeMutation.isPending,
    
    // Check status
    checkStatus: checkStatusMutation.mutateAsync,
    isCheckingStatus: checkStatusMutation.isPending,
    connectionStatus: checkStatusMutation.data,
    
    // Disconnect
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
    
    // Polling
    startPolling,
    stopPolling,
    isPolling: !!pollingIntervalRef.current,
    
    // Legacy - test connection
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,
    
    // Refetch settings
    refetch: query.refetch,
  };
};
