export type MinistryColorOption = {
  name: string;
  value: string; // hsl(H, S%, L%)
};

/**
 * Paleta EXPANDIDA com cores bem distintas para ministérios.
 * Espaçadas no matiz (hue) para máxima diferenciação visual.
 */
export const MINISTRY_COLOR_OPTIONS: MinistryColorOption[] = [
  // Vermelhos e Laranjas
  { name: "Vermelho", value: "hsl(0, 75%, 45%)" },
  { name: "Coral", value: "hsl(12, 80%, 55%)" },
  { name: "Laranja", value: "hsl(28, 90%, 50%)" },
  { name: "Âmbar", value: "hsl(42, 95%, 45%)" },
  
  // Amarelos e Verdes-Amarelados
  { name: "Ouro", value: "hsl(50, 90%, 42%)" },
  { name: "Amarelo", value: "hsl(58, 85%, 48%)" },
  { name: "Lima", value: "hsl(75, 70%, 38%)" },
  { name: "Oliva", value: "hsl(90, 55%, 35%)" },
  
  // Verdes
  { name: "Verde", value: "hsl(120, 55%, 35%)" },
  { name: "Esmeralda", value: "hsl(145, 60%, 34%)" },
  { name: "Jade", value: "hsl(160, 65%, 32%)" },
  
  // Azuis-Verdes (Teais)
  { name: "Turquesa", value: "hsl(175, 70%, 36%)" },
  { name: "Ciano", value: "hsl(188, 80%, 40%)" },
  { name: "Céu", value: "hsl(200, 75%, 48%)" },
  
  // Azuis
  { name: "Azul", value: "hsl(215, 80%, 50%)" },
  { name: "Cobalto", value: "hsl(230, 70%, 52%)" },
  
  // Roxos e Violetas
  { name: "Índigo", value: "hsl(245, 55%, 52%)" },
  { name: "Violeta", value: "hsl(265, 50%, 52%)" },
  { name: "Roxo", value: "hsl(280, 55%, 48%)" },
  { name: "Púrpura", value: "hsl(295, 50%, 45%)" },
  
  // Rosas e Magentas
  { name: "Magenta", value: "hsl(310, 60%, 48%)" },
  { name: "Fúcsia", value: "hsl(325, 65%, 50%)" },
  { name: "Rosa", value: "hsl(340, 70%, 52%)" },
  { name: "Cereja", value: "hsl(350, 75%, 48%)" },
  
  // Neutros e Terrosos
  { name: "Terracota", value: "hsl(15, 55%, 40%)" },
  { name: "Marrom", value: "hsl(25, 50%, 32%)" },
  { name: "Chocolate", value: "hsl(30, 45%, 28%)" },
  { name: "Cinza", value: "hsl(220, 12%, 45%)" },
  { name: "Ardósia", value: "hsl(210, 20%, 35%)" },
];
