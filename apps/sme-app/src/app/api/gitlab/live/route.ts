import { NextRequest, NextResponse } from 'next/server';
import type { Commit, LiveData, Pipeline } from '@/components/thesis-map/live-model';

export const dynamic = 'force-dynamic';
const messages = [
  'Create the cafe homepage',
  'Update the menu and prices',
  'Add contact information',
  'Improve the mobile layout',
  'Publish the latest cafe update',
];

// Demonstration data only. This endpoint makes no requests to GitLab.
export async function GET(request: NextRequest) {
  const selected = request.nextUrl.searchParams.get('pipeline');
  if (selected && !/^[1-5]$/.test(selected)) {
    return NextResponse.json({ error: 'Choose a sample pipeline from 1 to 5' }, { status: 400 });
  }
  const now = new Date().toISOString();
  const tick = Math.floor(Date.now() / 5000);
  const pipelines: Pipeline[] = messages.map((_, i) => ({
    id: i + 1, ref: 'sample/demo', status: 'running',
    sha: (i + 1).toString(16).repeat(40), web_url: '#', updated_at: now,
  }));
  const commits: Commit[] = pipelines.map((pipeline, i) => ({
    id: pipeline.sha, title: messages[i], message: messages[i],
    web_url: '#', committed_date: now,
  }));
  const index = selected ? Number(selected) - 1 : tick % messages.length;
  const activeStage = tick % 4;
  const data: LiveData = {
    fetchedAt: now, pipelines, pipeline: pipelines[index], commit: commits[index], commits,
    jobs: ['test', 'build', 'deploy_staging', 'deploy_production'].map((stage, i) => ({
      id: i + 1, name: stage.replace(/_/g, ' '), stage,
      status: i < activeStage ? 'success' : i === activeStage ? 'running' : 'pending',
      web_url: '#', started_at: i <= activeStage ? now : null,
      finished_at: i < activeStage ? now : null,
      duration: i < activeStage ? 5 : null, runner: { id: 1, description: 'Sample runner' },
    })),
    mergeRequests: [], deployments: [], jobsTruncated: false,
    deploymentNotice: 'Sample demonstration only. No real deployment records or GitLab requests.',
  };
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
