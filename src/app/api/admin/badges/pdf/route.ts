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

function buildPdf(badges: Badge[]): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 28,
        autoFirstPage: true,
      });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("Noto", FONT_REGULAR);
      doc.registerFont("Noto-Bold", FONT_BOLD);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 28;
      const cols = 3;
      const rows = 4;
      const gapX = 12;
      const gapY = 12;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2;
      const cellWidth = (usableWidth - gapX * (cols - 1)) / cols;
      const cellHeight = (usableHeight - gapY * (rows - 1)) / rows;
      const perPage = cols * rows;

      for (let i = 0; i < badges.length; i++) {
        if (i > 0 && i % perPage === 0) {
          doc.addPage();
        }

        const indexOnPage = i % perPage;
        const col = indexOnPage % cols;
        const row = Math.floor(indexOnPage / cols);
        const x = margin + col * (cellWidth + gapX);
        const y = margin + row * (cellHeight + gapY);
        const badge = badges[i];

        doc.roundedRect(x, y, cellWidth, cellHeight, 6).stroke("#d5d0bb");

        const qrSize = Math.min(cellWidth - 24, cellHeight - 72, 120);
        const qrPng = await QRCode.toBuffer(badge.badgeCode, {
          type: "png",
          width: Math.round(qrSize * 2),
          margin: 1,
          errorCorrectionLevel: "M",
        });

        const qrX = x + (cellWidth - qrSize) / 2;
        const qrY = y + 10;
        doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

        const textWidth = cellWidth - 16;
        const textX = x + 8;
        const codeY = y + cellHeight - 16;
        const companyY = badge.company ? codeY - 14 : codeY;
        const nameTop = qrY + qrSize + 8;
        const nameMaxHeight = Math.max(12, companyY - nameTop - 4);

        doc.font("Noto-Bold").fontSize(10).fillColor("#1c1a16");
        const nameHeight = Math.min(
          nameMaxHeight,
          doc.heightOfString(badge.fullName, { width: textWidth, align: "center" })
        );
        doc.text(badge.fullName, textX, nameTop, {
          width: textWidth,
          align: "center",
          height: nameHeight,
          ellipsis: true,
          lineBreak: true,
        });

        if (badge.company) {
          doc
            .font("Noto")
            .fontSize(8)
            .fillColor("#666055")
            .text(badge.company, textX, companyY, {
              width: textWidth,
              align: "center",
              lineBreak: false,
              ellipsis: true,
            });
        }

        doc
          .font("Noto")
          .fontSize(7)
          .fillColor("#999288")
          .text(badge.badgeCode, textX, codeY, {
            width: textWidth,
            align: "center",
            lineBreak: false,
          });
      }

      if (!badges.length) {
        doc.font("Noto").fontSize(14).text("Нет гостей для печати", { align: "center" });
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
