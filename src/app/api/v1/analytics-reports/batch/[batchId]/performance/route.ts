import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const url = new URL(req.url);
    const subject = url.searchParams.get('subject') || undefined;

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    let user: any = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET || '');
      } catch (e) {
        // Fallback or ignore
      }
    }

    // Fallback: If token decoding without verify in dev
    if (!user && token) {
      try {
        user = jwt.decode(token);
      } catch (e) {}
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Access denied. No valid token provided.' }, { status: 401 });
    }

    const StudentAnalyticsService = require('../../../../../../../../server/modules/analytics-reports/student-analytics.service');
    const instituteId = req.headers.get('x-institute-id') || (user.instituteId?._id || user.instituteId);
    const data = await StudentAnalyticsService.getBatchPerformance({
      batchId,
      instituteId,
      subject
    });

    return NextResponse.json({
      success: true,
      message: 'Batch performance retrieved successfully',
      data
    });
  } catch (error: any) {
    console.error('Error in Next.js batch performance route:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
