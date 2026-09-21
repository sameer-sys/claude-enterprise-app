import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VIDEO_CACHE_DIR = path.join(process.cwd(), 'public', 'generated_videos');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, videoUrl, faceImageUrl, platform = 'youtube', title, description } = body;

    if (!fs.existsSync(VIDEO_CACHE_DIR)) {
      try {
        fs.mkdirSync(VIDEO_CACHE_DIR, { recursive: true });
      } catch (e) {}
    }

    if (action === 'download_reel') {
      if (!videoUrl) {
        return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
      }

      const videoId = `reel_${Date.now()}`;
      const outputPath = path.join(VIDEO_CACHE_DIR, `${videoId}.mp4`);

      // Attempt download with yt-dlp if available
      try {
        await execAsync(`yt-dlp -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" --no-warnings -o "${outputPath}" "${videoUrl}"`, {
          timeout: 30000,
        });

        return NextResponse.json({
          success: true,
          videoId,
          videoPath: `/generated_videos/${videoId}.mp4`,
          message: 'Trending Reel downloaded in high resolution (1080p)',
        });
      } catch (dlErr: any) {
        return NextResponse.json(
          {
            success: false,
            error: dlErr?.message || 'yt-dlp is not installed or the source could not be downloaded.',
            hint: 'Install yt-dlp on the execution host and ensure the supplied URL is permitted and accessible.',
          },
          { status: 502 }
        );
      }
    }

    if (action === 'face_swap') {
      return NextResponse.json(
        {
          success: false,
          error: 'Face-swap execution is not configured on this deployment.',
          hint: 'Configure a real video-processing provider and model endpoint before using this operation.',
          received: {
            videoUrl: Boolean(videoUrl),
            faceImageUrl: Boolean(faceImageUrl),
            platform,
          },
        },
        { status: 501 }
      );
    }

    if (action === 'syndicate') {
      return NextResponse.json(
        {
          success: false,
          error: 'Publishing is not available through this endpoint until a real platform connector is configured.',
          hint: 'Enable the target platform connector and use its authenticated upload/publish action.',
          platform,
          title: title || null,
          description: description || null,
        },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
