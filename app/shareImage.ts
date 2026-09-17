import { formatYen } from "./calc.ts";
import type { CalculationResult } from "./model.ts";

/**
 * 送金結果を1枚の画像（PNG）に描き出す。
 *
 * テキストのコピーはそのまま残しつつ、LINE などにそのまま貼れる形も用意する。
 * Canvas 2D だけで完結するので、依存を増やさずサーバーも要らない。
 */

const WIDTH = 1080;
const PADDING = 72;
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Noto Sans JP", Meiryo, sans-serif';

type Palette = {
  background: string;
  card: string;
  ink: string;
  inkMuted: string;
  inkSubtle: string;
  brand: string;
  line: string;
};

const LIGHT: Palette = {
  background: "#f6f7fb",
  card: "#ffffff",
  ink: "#171a24",
  inkMuted: "#5a6175",
  inkSubtle: "#868da3",
  brand: "#4f46e5",
  line: "#e3e6ef",
};

const DARK: Palette = {
  background: "#0d0f16",
  card: "#171a24",
  ink: "#eceef5",
  inkMuted: "#a3aabf",
  inkSubtle: "#7a8299",
  brand: "#818cf8",
  line: "#2b3040",
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/** 幅に収まるように末尾を「…」で詰める */
function clip(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export function drawShareCard(
  canvas: HTMLCanvasElement,
  title: string,
  calculation: CalculationResult,
  isDark: boolean
): void {
  const palette = isDark ? DARK : LIGHT;
  const transfers = calculation.transfers;

  const headerHeight = 290;
  const rowHeight = 92;
  const rowGap = 12;
  const listHeight =
    transfers.length > 0 ? transfers.length * rowHeight + (transfers.length - 1) * rowGap : 96;
  const footerHeight = 96;
  const height = headerHeight + listHeight + footerHeight + PADDING;

  // 端末の解像度に合わせて2倍で描き、CSS上のサイズは元のままにする
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, WIDTH, height);

  // --- ヘッダー -------------------------------------------------------------
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = palette.inkSubtle;
  ctx.font = `600 24px ${FONT_STACK}`;
  ctx.fillText("ワリカン", PADDING, PADDING + 10);

  ctx.fillStyle = palette.ink;
  ctx.font = `700 52px ${FONT_STACK}`;
  ctx.fillText(clip(ctx, title.trim() || "精算", WIDTH - PADDING * 2), PADDING, PADDING + 80);

  ctx.fillStyle = palette.inkMuted;
  ctx.font = `500 26px ${FONT_STACK}`;
  ctx.fillText(
    `支出合計 ${formatYen(calculation.total)}円 ・ 参加者 ${calculation.rows.length}人`,
    PADDING,
    PADDING + 126
  );

  // 一覧の1枚目に重ならないよう、headerHeight から逆算して置く
  ctx.fillStyle = palette.inkSubtle;
  ctx.font = `600 22px ${FONT_STACK}`;
  ctx.fillText("送金", PADDING, headerHeight - 28);

  // --- 送金一覧 -------------------------------------------------------------
  let y = headerHeight;
  if (transfers.length === 0) {
    ctx.fillStyle = palette.card;
    roundedRect(ctx, PADDING, y, WIDTH - PADDING * 2, 96, 20);
    ctx.fill();
    ctx.fillStyle = palette.inkMuted;
    ctx.font = `500 30px ${FONT_STACK}`;
    ctx.fillText("送金は不要です", PADDING + 36, y + 58);
  } else {
    for (const transfer of transfers) {
      ctx.fillStyle = palette.card;
      roundedRect(ctx, PADDING, y, WIDTH - PADDING * 2, rowHeight, 20);
      ctx.fill();

      const amountText = `${formatYen(transfer.amount)}円`;
      ctx.font = `700 34px ${FONT_STACK}`;
      const amountWidth = ctx.measureText(amountText).width;

      ctx.fillStyle = palette.ink;
      ctx.font = `600 32px ${FONT_STACK}`;
      const nameArea = WIDTH - PADDING * 2 - amountWidth - 110;
      const names = `${transfer.from}  →  ${transfer.to}`;
      ctx.fillText(clip(ctx, names, nameArea), PADDING + 36, y + 58);

      ctx.fillStyle = palette.brand;
      ctx.font = `700 34px ${FONT_STACK}`;
      ctx.fillText(amountText, WIDTH - PADDING - 36 - amountWidth, y + 58);

      y += rowHeight + rowGap;
    }
  }

  // --- フッター -------------------------------------------------------------
  ctx.fillStyle = palette.inkSubtle;
  ctx.font = `400 22px ${FONT_STACK}`;
  const stamp = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  ctx.fillText(stamp, PADDING, height - PADDING + 12);
}

/**
 * 保存するファイル名を決める。
 *
 * blob URL の download 属性に日本語を入れると、ブラウザによっては
 * 無視されて拡張子なしの "download" というファイルになる（実測で確認）。
 * 画像の中には日本語のタイトルを描いてあるので、ファイル名は
 * ASCII に落として日付を付ける。
 */
export function shareCardFileName(title: string, today = new Date()): string {
  const asciiTitle = title
    .normalize("NFKC")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const date = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  return asciiTitle ? `warikan-${asciiTitle}-${date}.png` : `warikan-${date}.png`;
}

/** 画像として保存する。成功したら true。 */
export async function saveShareCard(
  title: string,
  calculation: CalculationResult,
  isDark: boolean
): Promise<boolean> {
  try {
    const canvas = document.createElement("canvas");
    drawShareCard(canvas, title, calculation, isDark);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((result) => resolve(result), "image/png")
    );
    if (!blob) return false;

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = shareCardFileName(title);
    document.body.appendChild(link);
    link.click();

    link.remove();
    // revoke が早すぎるとダウンロードが始まらない環境があるので、少し待つ
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}
