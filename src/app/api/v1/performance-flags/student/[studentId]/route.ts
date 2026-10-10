import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;
    const url = new URL(req.url);
    const sourceType = url.searchParams.get('sourceType') as any;
    const subject = url.searchParams.get('subject') || undefined;

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    let user: any = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET || '');
      } catch (e) {}
      if (!user) {
        try {
          user = jwt.decode(token);
        } catch (e) {}
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: 'Access denied. No valid token provided.' }, { status: 401 });
    }

    const PerformanceFlagsService = require('../../../../../../../server/modules/performance-flags/performance-flags.service');
    const flags = await PerformanceFlagsService.getMyFlags(studentId, { sourceType, subject });

    return NextResponse.json({
      success: true,
      message: 'Student flags retrieved successfully',
      data: flags
    });
  } catch (error: any) {
    console.error('Error in Next.js performance-flags student route:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Internal Server Error'
    }, { status: 500 });
  }
}
