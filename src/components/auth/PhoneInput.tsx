import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface PhoneInputProps {
  value: string;
  country: "BR" | "US" | "CA" | "PT";
  onValueChange: (phone: string) => void;
  onCountryChange: (country: "BR" | "US" | "CA" | "PT") => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showValidation?: boolean;
  showFieldLabels?: boolean;
}

const COUNTRY_CONFIG = {
  BR: {
    code: "+55",
    flag: "🇧🇷",
    placeholder: "(11) 99999-9999",
    expectedDigits: 11,
    formatHint: "DDD + 9 dígitos",
    mask: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 11);
      if (digits.length <= 2) return digits;
      if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    },
  },
  US: {
    code: "+1",
    flag: "🇺🇸",
    placeholder: "(555) 123-4567",
    expectedDigits: 10,
    formatHint: "Area code + 7 digits",
    mask: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
  },
  CA: {
    code: "+1",
    flag: "🇨🇦",
    placeholder: "(555) 123-4567",
    expectedDigits: 10,
    formatHint: "Area code + 7 digits",
    mask: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    },
  },
  PT: {
    code: "+351",
    flag: "🇵🇹",
    placeholder: "912 345 678",
    expectedDigits: 9,
    formatHint: "9 dígitos",
    mask: (value: string) => {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    },
  },
};

export const PhoneInput = ({
  value,
  country,
  onValueChange,
  onCountryChange,
  disabled = false,
  className = "",
  showValidation = true,
  showFieldLabels = false,
}: PhoneInputProps) => {
  const [displayValue, setDisplayValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const config = COUNTRY_CONFIG[country];
  const digitsCount = value.replace(/\D/g, "").length;
  const isComplete = digitsCount === config.expectedDigits;
  const hasContent = digitsCount > 0;
  const isPartial = hasContent && !isComplete;

  // Apply mask when value or country changes
  useEffect(() => {
    setDisplayValue(config.mask(value));
  }, [value, country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digitsOnly = rawValue.replace(/\D/g, "");
    onValueChange(digitsOnly);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Select
            value={country}
            onValueChange={(val) => onCountryChange(val as "BR" | "US" | "CA" | "PT")}
            disabled={disabled}
          >
            <SelectTrigger className="w-[110px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BR">
                <span className="flex items-center gap-2">
                  <span>🇧🇷</span>
                  <span>+55</span>
                </span>
              </SelectItem>
              <SelectItem value="US">
                <span className="flex items-center gap-2">
                  <span>🇺🇸</span>
                  <span>+1</span>
                </span>
              </SelectItem>
              <SelectItem value="CA">
                <span className="flex items-center gap-2">
                  <span>🇨🇦</span>
                  <span>+1</span>
                </span>
              </SelectItem>
              <SelectItem value="PT">
                <span className="flex items-center gap-2">
                  <span>🇵🇹</span>
                  <span>+351</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1 relative">
            <Input
              type="tel"
              value={displayValue}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={config.placeholder}
              disabled={disabled}
              className={cn(
                "h-11 pr-10 transition-colors",
                showValidation && isComplete && "border-green-500 focus-visible:ring-green-500/20",
                showValidation && isPartial && !isFocused && "border-amber-500"
              )}
            />
            {showValidation && hasContent && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
              </div>
            )}
          </div>
        </div>
        {showFieldLabels && (
          <p className="text-xs text-muted-foreground text-center w-full">
            {digitsCount === 0 
              ? `${config.formatHint} (só números)`
              : digitsCount < config.expectedDigits
                ? `Faltam ${config.expectedDigits - digitsCount} dígitos`
                : "✓ Número completo"
            }
          </p>
        )}
      </div>
      
      {/* Hint text - only when not using field labels */}
      {showValidation && !showFieldLabels && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            {config.formatHint}
          </span>
          {hasContent && (
            <span className={cn(
              "text-xs",
              isComplete ? "text-green-600" : "text-muted-foreground"
            )}>
              {digitsCount}/{config.expectedDigits} dígitos
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Helper to get clean phone number (digits only)
export const getCleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, "");
};

// Helper to format phone for display
export const formatPhoneDisplay = (phone: string, country: "BR" | "US" | "CA" | "PT" = "BR"): string => {
  const config = COUNTRY_CONFIG[country];
  return config.mask(phone);
};

// Helper to detect country from phone digits length
export const detectCountryFromPhone = (phone: string): "BR" | "US" => {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 ? "BR" : "US";
};

export default PhoneInput;
