const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const { FeeRecord, PaymentTransaction } = require('../fees-payments/fees-payments.model');
const UserModel = require('../users/users.model');
const InstituteModel = require('../institutes/institutes.model');

const NAVY = '#0B132B';
const GOLD = '#C99A2E';
const GOLD_SOFT = '#FBF5E6';
const INK = '#1F2937';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const PANEL = '#F7F8FB';
const GREEN = '#0F8A4B';

const LOGO_PATH = path.join(__dirname, '../../../public/arke_logo.png');
// Helvetica has no ₹ glyph, so only the rupee sign is drawn with Geist (SIL OFL).
const RUPEE_FONT_PATH = path.join(__dirname, '../../assets/fonts/Geist-Regular.ttf');

const BRAND = {
  name: 'ARKE Scholars',
  website: 'arkescholar.com',
  email: 'arkescholars@gmail.com'
};

const METHOD_LABELS = {
  RAZORPAY: 'Online (Razorpay)',
  EASEBUZZ: 'Online (Easebuzz)',
  ONLINE: 'Online',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI'
};

function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

const idOf = (v) => (v && typeof v === 'object' && v._id ? String(v._id) : v ? String(v) : '');

/**
 * Who may download a receipt: the paying student, that student's parent, or an
 * admin of the institute the payment belongs to (an admin with no institute is
 * a platform admin). Teachers and other students never can.
 */
function canAccessReceipt(reqUser, { student, instituteId }) {
  const userId = String(reqUser?.userId || reqUser?.id || reqUser?._id || '');
  if (!userId || !student) return false;
  const studentId = idOf(student);

  if (reqUser.role === 'student') return userId === studentId;
  if (reqUser.role === 'parent') {
    if (idOf(student.parentId) === userId) return true;
    return (reqUser.childrenIds || []).map(String).includes(studentId);
  }
  if (reqUser.role === 'admin') {
    if (!reqUser.instituteId) return true;
    return !instituteId || String(instituteId) === String(reqUser.instituteId);
  }
  return false;
}

function receiptNumber(id, date) {
  const d = new Date(date || Date.now());
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d).replace(/-/g, '');
  return `ARK-${ymd}-${String(id).slice(-6).toUpperCase()}`;
}

function formatDateTime(date) {
  const d = new Date(date || Date.now());
  const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(d);
  return `${day}, ${time.toUpperCase()} IST`;
}

function formatAmount(n) {
  return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function belowHundred(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
}

function belowThousand(n) {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? belowHundred(rest) : ''].filter(Boolean).join(' ');
}

/** Indian-system words: 125000.5 -> "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only" */
function amountInWords(amount) {
  const value = Math.max(0, Number(amount) || 0);
  let rupees = Math.floor(value);
  const paise = Math.round((value - rupees) * 100);
  const parts = [];
  const crore = Math.floor(rupees / 10000000); rupees %= 10000000;
  const lakh = Math.floor(rupees / 100000); rupees %= 100000;
  const thousand = Math.floor(rupees / 1000); rupees %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rupees) parts.push(belowThousand(rupees));
  let words = `Rupees ${parts.length ? parts.join(' ') : 'Zero'}`;
  if (paise) words += ` and ${belowHundred(paise)} Paise`;
  return `${words} Only`;
}

function methodLabel(method) {
  const raw = String(method || 'ONLINE').toUpperCase();
  if (raw.startsWith('OFFLINE_')) {
    const base = raw.replace('OFFLINE_', '');
    return `${METHOD_LABELS[base] || base.replace(/_/g, ' ')} (at institute)`;
  }
  return METHOD_LABELS[raw] || raw.replace(/_/g, ' ');
}

function batchLabel(batch) {
  if (!batch || !batch.name) return '';
  return `${batch.name}${batch.section ? ` (Sec ${batch.section})` : ''}`;
}

const STUDENT_FIELDS = 'firstName lastName email phone metadata parentId';

/**
 * Load everything the receipt needs and enforce access. Only SUCCESS payments
 * (or fully PAID fee records, which the transactions list shows when a student
 * has no gateway transactions) have a receipt.
 */
async function loadReceiptData(reqUser, id) {
  if (!mongoose.isValidObjectId(id)) throw httpError(404, 'Receipt not found.');

  let source = await PaymentTransaction.findById(id)
    .populate('studentId', STUDENT_FIELDS)
    .populate('courseId', 'name fee')
    .populate('batchId', 'name section')
    .populate({ path: 'feeRecordId', populate: [{ path: 'batchId', select: 'name section' }, { path: 'courseId', select: 'name' }] })
    .lean();
  let kind = 'transaction';

  if (!source) {
    source = await FeeRecord.findById(id)
      .populate('studentId', STUDENT_FIELDS)
      .populate('courseId', 'name fee')
      .populate('batchId', 'name section')
      .lean();
    kind = 'feeRecord';
  }
  if (!source) throw httpError(404, 'Receipt not found.');

  const student = source.studentId;
  if (reqUser.role === 'parent' && !reqUser.childrenIds) {
    const parent = await UserModel.findById(reqUser.userId || reqUser.id).select('childrenIds').lean();
    reqUser = { ...reqUser, childrenIds: parent?.childrenIds || [] };
  }
  if (!canAccessReceipt(reqUser, { student, instituteId: source.instituteId })) {
    throw httpError(403, 'You do not have access to this receipt.');
  }

  const paid = kind === 'transaction' ? source.status === 'SUCCESS' : source.status === 'PAID';
  if (!paid) throw httpError(409, 'A receipt is available only for successful payments.');

  const institute = source.instituteId
    ? await InstituteModel.findById(source.instituteId).select('name address contactEmail contactPhone').lean()
    : null;

  const course = source.courseId || source.feeRecordId?.courseId;
  const batch = source.batchId || source.feeRecordId?.batchId;
  const total = Number(kind === 'transaction' ? source.amountPaid : (source.amountPaid || source.amountDue)) || 0;
  const discount = Math.max(0, Number(source.discountAmount || source.discount || 0));
  const paidAt = source.updatedAt || source.createdAt;

  let installment = null;
  if (source.installmentNumber) {
    const inst = (source.feeRecordId?.installments || []).find((i) => i.installmentNumber === source.installmentNumber);
    installment = { number: source.installmentNumber, title: inst?.title || '' };
  }

  const method = String(source.paymentMethod || 'ONLINE').toUpperCase();
  const references = [];
  if (kind === 'transaction') {
    if (method === 'RAZORPAY') {
      references.push(['Razorpay Order ID', source.transactionId]);
      if (source.easepayid) references.push(['Razorpay Payment ID', source.easepayid]);
    } else if (method === 'EASEBUZZ') {
      references.push(['Transaction ID', source.transactionId]);
      if (source.easepayid) references.push(['Easebuzz Payment ID', source.easepayid]);
    } else {
      references.push(['Reference No.', source.transactionId]);
    }
    if (source.bankRefNum) references.push(['Bank Reference', source.bankRefNum]);
  } else {
    references.push(['Reference No.', `REC_${String(source._id).slice(-8).toUpperCase()}`]);
  }

  const feeTypeLabel = { TUITION: 'Tuition Fee', TRANSPORT: 'Transport Fee', EXAM: 'Exam Fee', OTHER: 'Fee Payment' };
  const title = course?.name || (kind === 'feeRecord' ? feeTypeLabel[source.feeType] || 'Fee Payment' : 'Course Enrollment');
  const details = [];
  if (batchLabel(batch)) details.push(`Batch: ${batchLabel(batch)}`);
  if (installment) details.push(`Installment #${installment.number}${installment.title ? ` - ${installment.title}` : ''}`);
  else if (course) details.push(kind === 'feeRecord' ? (feeTypeLabel[source.feeType] || 'Fee payment') : 'Course / batch enrollment fee');

  const studentName = `${student?.firstName || ''} ${student?.lastName && student.lastName !== '.' ? student.lastName : ''}`.trim() || 'Student';

  return {
    id: String(source._id),
    receiptNo: receiptNumber(source._id, source.createdAt || paidAt),
    paidAt,
    status: 'PAID',
    student: {
      name: studentName,
      phone: student?.phone || '',
      email: student?.email && !/^(student|parent)_.*@arke\.com$/.test(student.email) ? student.email : '',
      rollNo: student?.metadata?.rollNo || student?.metadata?.rollNumber || ''
    },
    item: { title: title.length > 260 ? `${title.slice(0, 257)}...` : title, details },
    amounts: { subtotal: total + discount, discount, total },
    method: methodLabel(method),
    references,
    institute: {
      name: institute?.name || BRAND.name,
      address: institute?.address || '',
      email: institute?.contactEmail || BRAND.email,
      phone: institute?.contactPhone || ''
    }
  };
}

/** Render the receipt as an A4 PDF and resolve with its bytes. */
function renderReceiptPdf(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: { Title: `Payment Receipt ${data.receiptNo}`, Author: BRAND.name, Subject: 'Payment Receipt' }
    });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const hasRupeeFont = fs.existsSync(RUPEE_FONT_PATH);
    if (hasRupeeFont) doc.registerFont('Rupee', RUPEE_FONT_PATH);

    const W = doc.page.width; // 595.28
    const H = doc.page.height; // 841.89
    const M = 48;
    const CW = W - M * 2;

    // Draw "₹1,234.00" with its right edge at x (or its left edge, align 'left').
    const money = (amount, x, y, size, color, font = 'Helvetica-Bold', opts = {}) => {
      const num = `${opts.prefix || ''}`;
      const value = formatAmount(amount);
      const symFont = hasRupeeFont ? 'Rupee' : font;
      const sym = hasRupeeFont ? '\u20B9' : 'Rs. ';
      doc.font(font).fontSize(size);
      const preW = num ? doc.widthOfString(num) : 0;
      const valW = doc.widthOfString(value);
      doc.font(symFont).fontSize(size);
      const symW = doc.widthOfString(sym) + (hasRupeeFont ? size * 0.08 : 0);
      const total = preW + symW + valW;
      let left = opts.align === 'left' ? x : x - total;
      if (num) { doc.font(font).fontSize(size).fillColor(color).text(num, left, y, { lineBreak: false }); left += preW; }
      doc.font(symFont).fontSize(size).fillColor(color).text(sym, left, y - (hasRupeeFont ? size * 0.07 : 0), { lineBreak: false });
      doc.font(font).fontSize(size).fillColor(color).text(value, left + symW, y, { lineBreak: false });
      return total;
    };

    // Right-aligned "Label  Value" pair on one line.
    const metaPair = (label, value, y) => {
      doc.font('Helvetica-Bold').fontSize(9.5);
      const vw = doc.widthOfString(value);
      doc.fillColor(INK).text(value, W - M - vw, y, { lineBreak: false });
      doc.font('Helvetica').fontSize(9.5);
      const lw = doc.widthOfString(label);
      doc.fillColor(MUTED).text(label, W - M - vw - 8 - lw, y, { lineBreak: false });
    };

    // ── Header ──────────────────────────────────────────────
    doc.rect(0, 0, W, 8).fill(NAVY);
    doc.rect(0, 8, W, 3).fill(GOLD);

    const headerTop = 34;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, M - 4, headerTop - 4, { height: 58 });
    } else {
      doc.font('Helvetica-Bold').fontSize(24).fillColor(NAVY).text('ARKE SCHOLARS', M, headerTop + 12);
    }

    doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY)
      .text('PAYMENT RECEIPT', M, headerTop + 2, { width: CW, align: 'right', characterSpacing: 1 });
    metaPair('Receipt No.', data.receiptNo, headerTop + 34);
    metaPair('Date', formatDateTime(data.paidAt), headerTop + 50);

    // Institute line under logo
    const inst = data.institute;
    const instLine = [inst.address, inst.phone, inst.email, BRAND.website].filter(Boolean).join('  •  ');
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED).text(instLine, M, headerTop + 66, { width: CW * 0.62 });

    let y = Math.max(doc.y, headerTop + 80) + 14;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.8).strokeColor(LINE).stroke();
    y += 22;

    // ── Amount hero ─────────────────────────────────────────
    const heroH = 96;
    doc.save().roundedRect(M, y, CW, heroH, 12).clip();
    doc.rect(M, y, CW, heroH).fill(NAVY);
    doc.rect(M, y + heroH - 4, CW, 4).fill(GOLD);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#AAB4CF')
      .text('TOTAL AMOUNT PAID', M + 26, y + 20, { characterSpacing: 1.2 });
    money(data.amounts.total, M + 26, y + 36, 30, '#FFFFFF', 'Helvetica-Bold', { align: 'left' });
    doc.font('Helvetica').fontSize(9.5).fillColor('#C9D1E6')
      .text(`Paid on ${formatDateTime(data.paidAt)}  •  ${data.method}`, M + 26, y + 74, { width: CW - 180 });

    // PAID badge
    const badgeW = 104;
    const badgeH = 34;
    const bx = W - M - 26 - badgeW;
    const by = y + (heroH - badgeH) / 2 - 4;
    doc.roundedRect(bx, by, badgeW, badgeH, 17).fill(GOLD);
    doc.circle(bx + 22, by + badgeH / 2, 8).fill('#FFFFFF');
    doc.save().lineWidth(2).strokeColor(GOLD)
      .moveTo(bx + 18, by + badgeH / 2).lineTo(bx + 21, by + badgeH / 2 + 3).lineTo(bx + 26.5, by + badgeH / 2 - 3.5).stroke().restore();
    doc.font('Helvetica-Bold').fontSize(14).fillColor(NAVY)
      .text('PAID', bx + 36, by + 11, { width: badgeW - 44, align: 'left', characterSpacing: 2 });

    y += heroH + 24;

    // ── Billed to / Payment details ─────────────────────────
    const colGap = 16;
    const colW = (CW - colGap) / 2;
    const rowsLeft = [
      ['Name', data.student.name],
      data.student.rollNo ? ['Roll No.', data.student.rollNo] : null,
      ['Phone', data.student.phone || '-'],
      ['Email', data.student.email || '-']
    ].filter(Boolean);
    const rowsRight = [
      ['Payment Method', data.method],
      ...data.references,
      ['Status', 'PAID']
    ];

    const labelWidth = (rows) => {
      doc.font('Helvetica').fontSize(9);
      return Math.max(...rows.map(([k]) => doc.widthOfString(k))) + 12;
    };
    const measureCard = (rows) => {
      const lw = labelWidth(rows);
      let h = 40;
      for (const [, v] of rows) {
        doc.font('Helvetica-Bold').fontSize(9.5);
        h += Math.max(14, doc.heightOfString(String(v), { width: colW - 28 - lw })) + 7;
      }
      return h + 6;
    };
    const cardH = Math.max(measureCard(rowsLeft), measureCard(rowsRight));

    const drawCard = (x, heading, rows) => {
      doc.roundedRect(x, y, colW, cardH, 10).fill(PANEL);
      doc.rect(x, y + 14, 3, 16).fill(GOLD);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY).text(heading, x + 14, y + 17, { characterSpacing: 1.2 });
      let ry = y + 40;
      const lw = labelWidth(rows);
      for (const [k, v] of rows) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(k, x + 14, ry, { width: lw });
        const isStatus = k === 'Status';
        doc.font('Helvetica-Bold').fontSize(9.5).fillColor(isStatus ? GREEN : INK)
          .text(String(v), x + 14 + lw, ry, { width: colW - 28 - lw });
        ry = Math.max(doc.y, ry + 14) + 7;
      }
    };
    drawCard(M, 'BILLED TO', rowsLeft);
    drawCard(M + colW + colGap, 'PAYMENT DETAILS', rowsRight);
    y += cardH + 26;

    // ── Items table ─────────────────────────────────────────
    const amtColW = 120;
    const qtyColW = 50;
    const descW = CW - amtColW - qtyColW - 32;
    doc.save().roundedRect(M, y, CW, 38, 8).clip();
    doc.rect(M, y, CW, 30).fill(NAVY);
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF');
    doc.text('DESCRIPTION', M + 16, y + 11, { characterSpacing: 1 });
    doc.text('QTY', M + 16 + descW, y + 11, { width: qtyColW, align: 'center', characterSpacing: 1 });
    doc.text('AMOUNT', W - M - 16 - amtColW, y + 11, { width: amtColW, align: 'right', characterSpacing: 1 });
    y += 30;

    doc.font('Helvetica-Bold').fontSize(11.5);
    const titleH = doc.heightOfString(data.item.title, { width: descW });
    doc.font('Helvetica').fontSize(9);
    const detailText = data.item.details.join('\n');
    const detailH = detailText ? doc.heightOfString(detailText, { width: descW }) + 4 : 0;
    const rowH = Math.max(44, titleH + detailH + 26);

    doc.rect(M, y, CW, rowH).fill('#FFFFFF');
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(INK).text(data.item.title, M + 16, y + 13, { width: descW });
    if (detailText) {
      doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(detailText, M + 16, doc.y + 4, { width: descW });
    }
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text('1', M + 16 + descW, y + 14, { width: qtyColW, align: 'center' });
    money(data.amounts.subtotal, W - M - 16, y + 14, 10.5, INK);
    y += rowH;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.8).strokeColor(LINE).stroke();
    y += 16;

    // ── Totals ──────────────────────────────────────────────
    const totX = W - M - 230;
    const totRow = (label, amount, prefix = '') => {
      doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, totX + 14, y, { lineBreak: false });
      money(amount, W - M - 16, y, 10, INK, 'Helvetica', { prefix });
      y += 20;
    };
    totRow('Subtotal', data.amounts.subtotal);
    totRow('Discount', data.amounts.discount, data.amounts.discount > 0 ? '- ' : '');
    y += 4;
    doc.roundedRect(totX, y, 230, 38, 8).fill(GOLD_SOFT);
    doc.rect(totX, y, 3, 38).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Total Paid', totX + 14, y + 13, { lineBreak: false });
    money(data.amounts.total, W - M - 16, y + 11, 14, NAVY);

    // Amount in words (left of totals)
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MUTED).text('AMOUNT IN WORDS', M, y - 40 + 2, { characterSpacing: 1 });
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(INK)
      .text(amountInWords(data.amounts.total), M, y - 24, { width: CW - 250 });
    y = Math.max(y + 38 + 34, H - 46 - 64 - 30);

    // ── Note ────────────────────────────────────────────────
    doc.roundedRect(M, y, CW, 64, 10).lineWidth(0.8).strokeColor(LINE).stroke();
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(NAVY).text('Thank you for learning with ARKE Scholars!', M + 16, y + 14);
    doc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
      .text(`This is a computer-generated receipt and does not require a signature. Fees once paid are subject to the institute's refund policy. For any query about this payment, write to ${inst.email}${inst.phone ? ` or call ${inst.phone}` : ''} quoting receipt no. ${data.receiptNo}.`,
        M + 16, y + 30, { width: CW - 32 });

    // ── Footer ──────────────────────────────────────────────
    const fy = H - 46;
    doc.rect(0, fy, W, 46).fill(NAVY);
    doc.rect(0, fy, W, 3).fill(GOLD);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF')
      .text(inst.name, M, fy + 17, { width: CW / 2, lineBreak: false });
    doc.font('Helvetica').fontSize(9).fillColor('#C9D1E6')
      .text(`${BRAND.website}  •  ${inst.email}`, M + CW / 2, fy + 17, { width: CW / 2, align: 'right', lineBreak: false });

    doc.end();
  });
}

module.exports = {
  canAccessReceipt,
  loadReceiptData,
  renderReceiptPdf,
  amountInWords,
  receiptNumber,
  httpError
};
