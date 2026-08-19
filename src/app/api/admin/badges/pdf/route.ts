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

/** 1 mm in PDF points */
const MM = 72 / 25.4;

const BADGE_W = 60 * MM;
const BADGE_H = 90 * MM;
const LOGO_W = 17 * MM;
const LOGO_H = 17.4 * MM;
const QR_SIZE = 28 * MM;
const PLATE_W = 60 * MM;
const PLATE_H = 16 * MM;
const PLATE_COLOR = "#d8d8d8";
const PER_PAGE = 4;

/** Offsets from badge top, calibrated to макет.pdf */
const LOGO_TOP = 51.3 - 42.52;
const NAME_TOP_1 = 102.1 - 42.52;
const NAME_TOP_2 = 128.0 - 42.52;
const QR_TOP = 157.56 - 42.52;
const CODE_TOP = 238.2 - 42.52;

const NAME_SIZE = 27;
const CODE_SIZE = 6;
const COMPANY_SIZE = 11;
const COMPANY_SIZE_SMALL = 10;

const FONT_BEBAS = path.join(process.cwd(), "assets/fonts/BebasNeueCyrillic-Regular.ttf");
const FONT_MONTSERRAT_BOLD = path.join(process.cwd(), "assets/fonts/Montserrat-Bold.ttf");
const FONT_MONTSERRAT_MEDIUM = path.join(process.cwd(), "assets/fonts/Montserrat-Medium.ttf");
const LOGO_PATH = path.join(process.cwd(), "assets/badge-header.jpg");

function titleWord(word: string) {
  if (!word) return "";
  return word.charAt(0).toLocaleUpperCase("ru-RU") + word.slice(1).toLocaleLowerCase("ru-RU");
}

function splitName(fullName: string): { line1: string; line2: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { line1: "", line2: "" };
  if (parts.length === 1) return { line1: titleWord(parts[0]), line2: "" };
  return {
    line1: titleWord(parts[0]),
    line2: parts.slice(1).map(titleWord).join(" "),
  };
}

function drawCropMarks(doc: PDFKit.PDFDocument, originX: number, originY: number) {
  const arm = 8.9 / 2;
  const xs = Array.from({ length: PER_PAGE + 1 }, (_, i) => originX + i * BADGE_W);
  const ys = [originY, originY + BADGE_H, originY + BADGE_H * 2];

  doc.save();
  doc.strokeColor("#000000").lineWidth(0.5);
  for (const x of xs) {
    for (const y of ys) {
      doc
        .moveTo(x - arm, y)
        .lineTo(x + arm, y)
        .moveTo(x, y - arm)
        .lineTo(x, y + arm)
        .stroke();
    }
  }
  doc.restore();
}

async function drawBadgeFace(
  doc: PDFKit.PDFDocument,
  badge: Badge,
  x: number,
  y: number,
  upsideDown: boolean
) {
  doc.save();
  if (upsideDown) {
    doc.translate(x + BADGE_W, y + BADGE_H);
    doc.rotate(180);
  } else {
    doc.translate(x, y);
  }

  doc.image(LOGO_PATH, (BADGE_W - LOGO_W) / 2, LOGO_TOP, {
    width: LOGO_W,
    height: LOGO_H,
  });

  const { line1, line2 } = splitName(badge.fullName);
  doc.font("Bebas").fontSize(NAME_SIZE).fillColor("#000000");
  if (line1) {
    doc.text(line1, 0, NAME_TOP_1, {
      width: BADGE_W,
      align: "center",
      lineBreak: false,
    });
  }
  if (line2) {
    doc.text(line2, 0, NAME_TOP_2, {
      width: BADGE_W,
      align: "center",
      lineBreak: false,
    });
  }

  const qrLeft = (BADGE_W - QR_SIZE) / 2;
  const qrPng = await QRCode.toBuffer(badge.badgeCode, {
    type: "png",
    width: Math.round(QR_SIZE * 3),
    margin: 1,
    errorCorrectionLevel: "M",
  });
  doc.image(qrPng, qrLeft, QR_TOP, { width: QR_SIZE, height: QR_SIZE });

  // Код выровнен по правому краю QR (как в макете)
  doc.font("Montserrat-Medium").fontSize(CODE_SIZE).fillColor("#000000");
  const codeWidth = doc.widthOfString(badge.badgeCode);
  doc.text(badge.badgeCode, qrLeft + QR_SIZE - codeWidth, CODE_TOP, {
    lineBreak: false,
    width: codeWidth + 1,
  });

  const plateY = BADGE_H - PLATE_H;
  doc.rect(0, plateY, PLATE_W, PLATE_H).fill(PLATE_COLOR);

  if (badge.company) {
    const company = badge.company.trim();
    doc.font("Montserrat-Bold").fillColor("#000000");

    doc.fontSize(COMPANY_SIZE);
    const oneLine = doc.heightOfString(company, {
      width: PLATE_W - 8,
      align: "center",
    });
    const size =
      oneLine > COMPANY_SIZE * 1.35 || doc.widthOfString(company) > PLATE_W - 8
        ? COMPANY_SIZE_SMALL
        : COMPANY_SIZE;
    doc.fontSize(size);

    const textH = Math.min(
      PLATE_H - 4,
      doc.heightOfString(company, { width: PLATE_W - 8, align: "center" })
    );
    const textTop = plateY + (PLATE_H - textH) / 2;
    doc.text(company, 4, textTop, {
      width: PLATE_W - 8,
      align: "center",
      height: PLATE_H - 2,
      ellipsis: true,
      lineBreak: true,
    });
  }

  doc.restore();
}

function buildPdf(badges: Badge[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 0,
        autoFirstPage: true,
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Bebas", FONT_BEBAS);
      doc.registerFont("Montserrat-Bold", FONT_MONTSERRAT_BOLD);
      doc.registerFont("Montserrat-Medium", FONT_MONTSERRAT_MEDIUM);

      if (!badges.length) {
        doc.font("Montserrat-Medium").fontSize(14).text("Нет гостей для печати", 40, 80);
        doc.end();
        return;
      }

      const pageW = doc.page.width;
      const pageH = doc.page.height;
      const originX = (pageW - PER_PAGE * BADGE_W) / 2;
      const originY = (pageH - 2 * BADGE_H) / 2;

      for (let pageStart = 0; pageStart < badges.length; pageStart += PER_PAGE) {
        if (pageStart > 0) doc.addPage({ size: "A4", layout: "landscape", margin: 0 });

        drawCropMarks(doc, originX, originY);

        const pageBadges = badges.slice(pageStart, pageStart + PER_PAGE);
        for (let i = 0; i < pageBadges.length; i++) {
          const badge = pageBadges[i];
          const bx = originX + i * BADGE_W;
          await drawBadgeFace(doc, badge, bx, originY, false);
          await drawBadgeFace(doc, badge, bx, originY + BADGE_H, true);
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
