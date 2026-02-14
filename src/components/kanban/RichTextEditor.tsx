import { useState, useRef, useCallback } from "react";
import { Bold, Italic, List, Link, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
}

const RichTextEditor = ({ 
  value, 
  onChange, 
  onSave, 
  onCancel,
  placeholder = "Adicione uma descrição mais detalhada..." 
}: RichTextEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wrapSelection = useCallback((before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = 
      value.substring(0, start) + 
      before + selectedText + after + 
      value.substring(end);
    
    onChange(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length, 
        end + before.length
      );
    }, 0);
  }, [value, onChange]);

  const handleBold = () => wrapSelection("**", "**");
  const handleItalic = () => wrapSelection("*", "*");
  const handleList = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    
    const newText = 
      value.substring(0, lineStart) + 
      "- " + 
      value.substring(lineStart);
    
    onChange(newText);
  };
  
  const handleLink = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (selectedText) {
      wrapSelection("[", "](url)");
    } else {
      const newText = 
        value.substring(0, start) + 
        "[texto do link](url)" + 
        value.substring(end);
      onChange(newText);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1.5 bg-muted rounded-md border border-border">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-background"
          onClick={handleBold}
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-background"
          onClick={handleItalic}
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-background"
          onClick={handleList}
          title="Lista"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-background"
          onClick={handleLink}
          title="Link"
        >
          <Link className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 hover:bg-background"
          title="Mais opções"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[120px] resize-none bg-background border-2 border-input shadow-sm focus:border-primary"
        autoFocus
      />

      {/* Actions - More prominent */}
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onSave} className="px-4">
          Salvar
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="px-4">
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default RichTextEditor;
