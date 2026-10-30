import type { Pos } from "./types";

export interface Slot { role: Pos; label: string; x: number; y: number }
const s = (role: Pos, label: string, x: number, y: number): Slot => ({ role, label, x, y });

// y: 0 = attack, 100 = own goal
export const FORMATIONS: Record<string, Slot[]> = {
  "4-3-3": [s("GOL", "GOL", 50, 92), s("LAT", "LD", 85, 72), s("ZAG", "ZAG", 62, 76), s("ZAG", "ZAG", 38, 76), s("LAT", "LE", 15, 72),
    s("VOL", "VOL", 50, 58), s("MEI", "MC", 68, 46), s("MEI", "MC", 32, 46), s("PON", "PD", 82, 22), s("ATA", "CA", 50, 14), s("PON", "PE", 18, 22)],
  "4-2-3-1": [s("GOL", "GOL", 50, 92), s("LAT", "LD", 85, 72), s("ZAG", "ZAG", 62, 76), s("ZAG", "ZAG", 38, 76), s("LAT", "LE", 15, 72),
    s("VOL", "VOL", 62, 58), s("VOL", "VOL", 38, 58), s("PON", "MD", 82, 34), s("MEI", "MEI", 50, 36), s("PON", "ME", 18, 34), s("ATA", "CA", 50, 14)],
  "4-4-2": [s("GOL", "GOL", 50, 92), s("LAT", "LD", 85, 72), s("ZAG", "ZAG", 62, 76), s("ZAG", "ZAG", 38, 76), s("LAT", "LE", 15, 72),
    s("PON", "MD", 84, 44), s("VOL", "VOL", 60, 52), s("MEI", "MC", 40, 48), s("PON", "ME", 16, 44), s("ATA", "CA", 62, 16), s("ATA", "CA", 38, 16)],
  "3-5-2": [s("GOL", "GOL", 50, 92), s("ZAG", "ZAG", 72, 76), s("ZAG", "ZAG", 50, 78), s("ZAG", "ZAG", 28, 76), s("LAT", "ALD", 88, 48),
    s("VOL", "VOL", 50, 58), s("MEI", "MC", 66, 42), s("MEI", "MC", 34, 42), s("LAT", "ALE", 12, 48), s("ATA", "CA", 62, 16), s("ATA", "CA", 38, 16)],
  "3-4-3": [s("GOL", "GOL", 50, 92), s("ZAG", "ZAG", 72, 76), s("ZAG", "ZAG", 50, 78), s("ZAG", "ZAG", 28, 76), s("LAT", "ALD", 86, 50),
    s("VOL", "VOL", 60, 54), s("MEI", "MC", 40, 50), s("LAT", "ALE", 14, 50), s("PON", "PD", 80, 22), s("ATA", "CA", 50, 14), s("PON", "PE", 20, 22)],
  "4-1-4-1": [s("GOL", "GOL", 50, 92), s("LAT", "LD", 85, 72), s("ZAG", "ZAG", 62, 76), s("ZAG", "ZAG", 38, 76), s("LAT", "LE", 15, 72),
    s("VOL", "VOL", 50, 60), s("PON", "MD", 84, 40), s("MEI", "MC", 62, 44), s("MEI", "MC", 38, 44), s("PON", "ME", 16, 40), s("ATA", "CA", 50, 14)],
  "5-3-2": [s("GOL", "GOL", 50, 92), s("LAT", "ALD", 88, 64), s("ZAG", "ZAG", 70, 76), s("ZAG", "ZAG", 50, 78), s("ZAG", "ZAG", 30, 76), s("LAT", "ALE", 12, 64),
    s("VOL", "VOL", 50, 54), s("MEI", "MC", 68, 44), s("MEI", "MC", 32, 44), s("ATA", "CA", 62, 16), s("ATA", "CA", 38, 16)],
  "4-3-1-2": [s("GOL", "GOL", 50, 92), s("LAT", "LD", 85, 72), s("ZAG", "ZAG", 62, 76), s("ZAG", "ZAG", 38, 76), s("LAT", "LE", 15, 72),
    s("VOL", "VOL", 50, 60), s("MEI", "MC", 70, 50), s("MEI", "MC", 30, 50), s("MEI", "MEI", 50, 34), s("ATA", "CA", 62, 16), s("ATA", "CA", 38, 16)],
};

export const STYLES = ["Equilibrado", "Ofensivo", "Defensivo", "Posse de bola", "Contra-ataque"];
export const PRESSING = ["Pressão média", "Pressão alta", "Bloco baixo"];

export const INSTRUCTIONS: Record<Pos, string[]> = {
  GOL: ["Padrão", "Repor curto", "Repor longo"],
  ZAG: ["Padrão", "Saída curta", "Afastar o perigo"],
  LAT: ["Padrão", "Apoiar o ataque", "Ficar na defesa"],
  VOL: ["Padrão", "Proteger a defesa", "Sair para o jogo"],
  MEI: ["Padrão", "Liberdade para criar", "Chegar na área"],
  PON: ["Padrão", "Ajudar na marcação", "Ficar adiantado"],
  ATA: ["Padrão", "Pressionar defensores", "Recuar para armar"],
};
