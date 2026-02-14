import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import { useData } from "@/contexts/DataContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Announcement } from "@/hooks/useAnnouncements";

const colorPresets = [
  { name: "Azul", bg: "hsl(231, 48%, 48%)", text: "hsl(0, 0%, 100%)" },
  { name: "Verde", bg: "hsl(142, 52%, 45%)", text: "hsl(0, 0%, 100%)" },
  { name: "Amarelo", bg: "hsl(48, 96%, 53%)", text: "hsl(0, 0%, 0%)" },
  { name: "Laranja", bg: "hsl(25, 95%, 53%)", text: "hsl(0, 0%, 100%)" },
  { name: "Rosa", bg: "hsl(330, 65%, 50%)", text: "hsl(0, 0%, 100%)" },
  { name: "Ciano", bg: "hsl(200, 70%, 45%)", text: "hsl(0, 0%, 100%)" },
  { name: "Roxo", bg: "hsl(280, 60%, 50%)", text: "hsl(0, 0%, 100%)" },
  { name: "Cinza", bg: "hsl(220, 9%, 46%)", text: "hsl(0, 0%, 100%)" },
  { name: "Escuro", bg: "hsl(222, 47%, 11%)", text: "hsl(0, 0%, 100%)" },
];

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { addAnnouncement, updateAnnouncement, getAnnouncementById } = useData();
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(colorPresets[0].bg);
  const [textColor, setTextColor] = useState(colorPresets[0].text);
  const [status, setStatus] = useState<"published" | "draft">("draft");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split('T')[0]);
  const [unpublishDate, setUnpublishDate] = useState("");
  const [externalLink, setExternalLink] = useState("");

  useEffect(() => {
    if (isEditing && id) {
      const announcement = getAnnouncementById(id);
      if (announcement) {
        setTitle(announcement.title);
        setContent(announcement.content);
        setBackgroundColor(announcement.backgroundColor);
        setTextColor(announcement.textColor);
        setStatus(announcement.status);
        setPriority(announcement.priority);
        setPublishDate(announcement.publishDate);
        setUnpublishDate(announcement.unpublishDate || "");
        setExternalLink(announcement.externalLink || "");
      }
    }
  }, [isEditing, id, getAnnouncementById]);

  const handleColorPresetClick = (preset: typeof colorPresets[0]) => {
    setBackgroundColor(preset.bg);
    setTextColor(preset.text);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const announcementData = {
      title,
      content,
      backgroundColor,
      textColor,
      status,
      priority,
      publishDate,
      unpublishDate: unpublishDate || undefined,
      externalLink: externalLink || undefined,
      createdBy: user?.id || "1",
    };

    if (isEditing && id) {
      updateAnnouncement(id, announcementData);
      toast({
        title: "Aviso atualizado",
        description: `"${title}" foi atualizado com sucesso.`,
      });
    } else {
      addAnnouncement(announcementData);
      toast({
        title: "Aviso criado",
        description: `"${title}" foi adicionado ao mural.`,
      });
    }

    navigate("/mural");
  };

  // Preview data (using partial type for preview purposes)
  const previewAnnouncement = {
    id: "preview",
    title: title || "Título do Aviso",
    content: content || "O conteúdo do seu aviso aparecerá aqui...",
    backgroundColor,
    textColor,
    status,
    priority,
    publishDate,
    unpublishDate,
    externalLink,
    createdAt: new Date().toISOString().split('T')[0],
    createdBy: user?.id || "1",
    organization_id: "",
  };

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <header className="bg-card border-b p-4 lg:p-6">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {isEditing ? "Editar Aviso" : "Novo Aviso"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditing ? "Altere as informações do aviso" : "Preencha os dados do aviso"}
            </p>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="p-4 lg:p-6">
        <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-6">
          {/* Form Column */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Aviso</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Culto Especial de Natal"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="bg-muted/50 shadow-sm"
                  />
                </div>

                {/* Conteúdo */}
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    placeholder="Escreva o conteúdo do aviso..."
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    className="bg-muted/50 shadow-sm"
                  />
                </div>

                {/* Cores */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cor do Aviso
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleColorPresetClick(preset)}
                        className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                        style={{ 
                          backgroundColor: preset.bg,
                          borderColor: backgroundColor === preset.bg ? 'hsl(var(--primary))' : 'transparent',
                        }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Publicar aviso</p>
                      <p className="text-xs text-muted-foreground">
                        {status === "published" ? "Visível para todos" : "Salvar como rascunho"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={status === "published"}
                    onCheckedChange={(checked) => setStatus(checked ? "published" : "draft")}
                  />
                </div>

                {/* Prioridade */}
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                    <SelectTrigger className="bg-muted/50 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Importante</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Datas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publishDate">Data de Publicação</Label>
                    <Input
                      id="publishDate"
                      type="date"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      required
                      className="bg-muted/50 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unpublishDate">Despublicar em (opcional)</Label>
                    <Input
                      id="unpublishDate"
                      type="date"
                      value={unpublishDate}
                      onChange={(e) => setUnpublishDate(e.target.value)}
                      min={publishDate}
                      className="bg-muted/50 shadow-sm"
                    />
                  </div>
                </div>

                {/* Link Externo */}
                <div className="space-y-2">
                  <Label htmlFor="externalLink">Link Externo (opcional)</Label>
                  <Input
                    id="externalLink"
                    type="url"
                    placeholder="https://..."
                    value={externalLink}
                    onChange={(e) => setExternalLink(e.target.value)}
                    className="bg-muted/50 shadow-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Link para formulário de inscrição, site externo, etc.
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => navigate("/mural")} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                  {isEditing ? "Salvar Alterações" : "Salvar Aviso"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Preview Column */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Pré-visualização
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnnouncementCard announcement={previewAnnouncement} />
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center">
              Esta é uma prévia de como o aviso aparecerá no mural.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementForm;
