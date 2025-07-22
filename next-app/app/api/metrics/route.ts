import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const metrics = await globalThis?.metrics?.registry.metrics();
    
    if (!metrics) {
      return NextResponse.json(
        { error: 'Metrics not initialized' },
        { status: 500 }
      );
    }

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': globalThis?.metrics?.registry.contentType ?? 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}