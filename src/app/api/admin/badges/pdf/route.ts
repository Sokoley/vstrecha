import { NextResponse } from "next/server";
import path from "path";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Badge = {
  fullName: string;
  company: string | null;
  badgeCode: string;
};

const FONT_REGULAR = path.join(process.cwd(), "assets/fonts/NotoSans-Regular.ttf");
const FONT_BOLD = path.join(process.cwd(), "assets/fonts/NotoSans-Bold.ttf");
const LOGO_PATH = path.join(process.cwd(), "assets/badge-header.jpg");
const LOGO_RATIO = 722 / 631;
const PER_PAGE = 4;

function drawCropMarks(doc: PDFKit.PDFDocument) {
  const w = doc.page.width;
  const h = doc.page.height;
  const size = 5;
  const points = [
    [0, 0],
    [w / 2, 0],
    [w, 0],
    [0, h / 2],
    [w / 2, h / 2],
    [w, h / 2],
    [0, h],
    [w / 2, h],
    [w, h],
  ] as const;

  doc.save();
  doc.strokeColor("#b0aaa0").lineWidth(0.6);
  for (const [cx, cy] of points) {
    doc
      .moveTo(cx - size, cy)
      .lineTo(cx + size, cy)
      .moveTo(cx, cy - size)
      .lineTo(cx, cy + size)
      .stroke();
  }
  doc.restore();
}

function drawGuides(doc: PDFKit.PDFDocument) {
  const w = doc.page.width;
  const h = doc.page.height;
  const half = h / 2;
  const colW = w / PER_PAGE;

  doc.save();
  doc.strokeColor("#d9d4c6").lineWidth(0.5);
  doc.moveTo(0, half).lineTo(w, half).stroke();
  for (let i = 1; i < PER_PAGE; i++) {
    const x = colW * i;
    doc.moveTo(x, 0).lineTo(x, h).stroke();
  }
  doc.restore();
}

async function drawBadgeFace(
  doc: PDFKit.PDFDocument,
  badge: Badge,
  x: number,
  y: number,
  cellW: number,
  cellH: number,
  upsideDown: boolean
) {
  doc.save();
  if (upsideDown) {
    doc.translate(x + cellW, y + cellH);
    doc.rotate(180);
  } else {
    doc.translate(x, y);
  }

  const padX = 7;
  const contentW = cellW - padX * 2;
  let cursorY = 10;

  const maxLogoH = cellH * 0.2;
  let logoW = contentW * 0.92;
  let logoH = logoW / LOGO_RATIO;
  if (logoH > maxLogoH) {
    logoH = maxLogoH;
    logoW = logoH * LOGO_RATIO;
  }
  doc.image(LOGO_PATH, (cellW - logoW) / 2, cursorY, { width: logoW, height: logoH });
  cursorY += logoH + 6;

  const name = badge.fullName.trim().toUpperCase();
  const nameMaxH = cellH * 0.14;
  let nameSize = 12;
  doc.font("Noto-Bold").fillColor("#1c1a16");
  while (nameSize > 7) {
    doc.fontSize(nameSize);
    const h = doc.heightOfString(name, { width: contentW, align: "center" });
    if (h <= nameMaxH) break;
    nameSize -= 0.5;
  }
  doc.fontSize(nameSize);
  const nameH = Math.min(
    nameMaxH,
    doc.heightOfString(name, { width: contentW, align: "center" })
  );
  doc.text(name, padX, cursorY, {
    width: contentW,
    align: "center",
    height: nameH,
    ellipsis: true,
    lineBreak: true,
  });
  cursorY += nameH + 6;

  const companyBoxH = badge.company ? 22 : 0;
  const codeH = 12;
  const bottomReserve = companyBoxH + codeH + 14;
  const qrMax = Math.min(contentW * 0.78, cellH - cursorY - bottomReserve);
  const qrSize = Math.max(48, qrMax);
  const qrPng = await QRCode.toBuffer(badge.badgeCode, {
    type: "png",
    width: Math.round(qrSize * 2),
    margin: 1,
    errorCorrectionLevel: "M",
  });
  doc.image(qrPng, (cellW - qrSize) / 2, cursorY, { width: qrSize, height: qrSize });
  cursorY += qrSize + 5;

  doc
    .font("Noto")
    .fontSize(8)
    .fillColor("#666055")
    .text(badge.badgeCode, padX, cursorY, {
      width: contentW,
      align: "center",
      lineBreak: false,
    });

  if (badge.company) {
    const boxY = cellH - companyBoxH - 8;
    const boxX = padX;
    const boxW = contentW;
    doc.roundedRect(boxX, boxY, boxW, companyBoxH, 3).fill("#e8e6df");
    doc
      .font("Noto")
      .fontSize(7.5)
      .fillColor("#3a372f")
      .text(badge.company, boxX + 3, boxY + 6, {
        width: boxW - 6,
        align: "center",
        lineBreak: false,
        ellipsis: true,
        height: 12,
      });
  }

  doc.restore();
}

function buildPdf(badges: Badge[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        autoFirstPage: true,
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Noto", FONT_REGULAR);
      doc.registerFont("Noto-Bold", FONT_BOLD);

      if (!badges.length) {
        doc.font("Noto").fontSize(14).text("Нет гостей для печати", 40, 80, { align: "center" });
        doc.end();
        return;
      }

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const cellW = pageW / PER_PAGE;
      const cellH = pageH / 2;

      for (let pageStart = 0; pageStart < badges.length; pageStart += PER_PAGE) {
        if (pageStart > 0) doc.addPage();

        drawGuides(doc);
        drawCropMarks(doc);

        const pageBadges = badges.slice(pageStart, pageStart + PER_PAGE);
        for (let i = 0; i < pageBadges.length; i++) {
          const badge = pageBadges[i];
          const x = i * cellW;
          await drawBadgeFace(doc, badge, x, 0, cellW, cellH, false);
          await drawBadgeFace(doc, badge, x, cellH, cellW, cellH, true);
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function GET() {
  const guests = await prisma.guest.findMany({
    orderBy: { fullName: "asc" },
    select: { fullName: true, company: true, badgeCode: true },
  });

  const pdf = await buildPdf(guests);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="qr-badges.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
